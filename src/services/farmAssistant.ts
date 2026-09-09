import { db } from './db';
import { ExpenseCategory, PaymentMethod, UserRole } from '../types';

export type AssistantAction =
  | { type: 'record_weight'; pigId: string; weight: number; date: string; notes?: string }
  | { type: 'add_expense'; amount: number; category: ExpenseCategory; description: string; date: string };

export interface AssistantResult {
  text: string;
  action?: AssistantAction;
  refresh?: boolean;
}

const READ_ONLY_ROLES: UserRole[] = ['admin', 'manager', 'worker'];
const FINANCIAL_ROLES: UserRole[] = ['admin', 'manager'];

function money(value: number): string {
  const symbol = db.getFarm().currency_symbol || '₹';
  return `${symbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  return today().slice(0, 7);
}

function audit(action: string, target: string, success: boolean, error?: string): void {
  const key = 'pfms_ai_audit_log';
  const entries = JSON.parse(localStorage.getItem(key) || '[]') as unknown[];
  entries.unshift({
    user_id: db.getCurrentUser().id,
    farm_id: db.getFarm().id,
    action,
    target,
    success,
    error,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(entries.slice(0, 250)));
}

function isAllowed(role: UserRole, roles: UserRole[]): boolean {
  return roles.includes(role);
}

function parseDate(text: string): string {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  return iso ? iso[0] : today();
}

function parseWeightAction(input: string): AssistantAction | undefined {
  const pig = input.match(/(?:pig\s*)?([a-z]{1,5}[-\s]?\d{2,})/i);
  const weight = input.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\b/i);
  if (!pig || !weight) return undefined;
  const record = db.getPigById(pig[1].replace(/\s+/g, '-'));
  if (!record) return undefined;
  return { type: 'record_weight', pigId: record.id, weight: Number(weight[1]), date: parseDate(input) };
}

export function answerFarmQuestion(input: string, role: UserRole): AssistantResult {
  const query = input.trim().toLowerCase();
  const stats = db.getDashboardStats();
  const pigs = db.getPigs();
  const month = currentMonth();
  const sales = db.getSales().filter((sale) => sale.sale_date.startsWith(month));
  const expenses = db.getExpenses().filter((expense) => expense.date.startsWith(month));

  if (!isAllowed(role, READ_ONLY_ROLES)) return { text: 'You are not authorized to view farm records.' };

  const weightAction = parseWeightAction(input);
  if (weightAction?.type === 'record_weight') {
    if (weightAction.weight <= 0) return { text: 'Weight must be greater than zero.' };
    return {
      text: `I found ${pigs.find((pig) => pig.id === weightAction.pigId)?.pig_id}. Please confirm recording ${weightAction.weight} kg for this pig.`,
      action: weightAction,
    };
  }

  const pigId = input.match(/\b([a-z]{1,5}[-\s]?\d{2,})\b/i)?.[1]?.replace(/\s+/g, '-');
  if (pigId && /(show|find|details|about|who is)/i.test(input)) {
    const pig = db.getPigById(pigId);
    if (!pig) return { text: `I don't have a pig with ID ${pigId} in the farm records.` };
    const health = db.getHealthRecords(pig.id).slice(0, 3);
    return {
      text: `${pig.pig_id} is a ${pig.sex.toLowerCase()} ${pig.breed} weighing ${pig.current_weight} kg. Status: ${pig.status}. Pen: ${pig.pen_location}.${health.length ? ` Latest health record: ${health[0].type} on ${health[0].record_date}.` : ' No health records are recorded.'}`,
    };
  }

  if (/(summary|overview|how is the farm|farm report)/i.test(input)) {
    const lowFeed = db.getFeedItems().filter((feed) => feed.quantity <= feed.min_stock);
    const sickPigs = pigs.filter((pig) => pig.status === 'Sick').length;
    return {
      text: `FARM SUMMARY\n\nLivestock\n${stats.totalPigs} active pigs: ${stats.femalePigs} female, ${stats.malePigs} male, ${stats.piglets} piglets.\n\nBreeding\n${stats.pregnantSows} pregnant sows and ${stats.upcomingDeliveriesCount} upcoming deliveries.\n\nThis month\nSales: ${money(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}\nExpenses: ${money(expenses.reduce((sum, expense) => sum + expense.amount, 0))}\nOperating result: ${money(stats.netProfit)}\n\nAlerts\n${sickPigs} pigs marked sick and ${lowFeed.length} feed items at or below minimum stock.`,
    };
  }

  if (/(how many|number|count).*(pig|livestock)/i.test(input)) {
    const active = pigs.filter((pig) => ['Active', 'Pregnant', 'Sick'].includes(pig.status));
    if (/(female|sow)/i.test(input)) return { text: `There are ${stats.femalePigs} active female pigs.` };
    if (/(male|boar)/i.test(input)) return { text: `There are ${stats.malePigs} active male pigs.` };
    return { text: active.length ? `You currently have ${active.length} active pigs.` : "I don't have any active livestock records yet." };
  }

  if (/(pregnant|expect.*birth|due)/i.test(input)) {
    const pregnant = db.getBreedingRecords().filter((record) => record.status === 'Pregnant');
    if (!pregnant.length) return { text: "I don't have any pregnant sow records." };
    const next = pregnant.slice(0, 5).map((record) => `${record.sow_tag || record.sow_id} due ${record.expected_delivery_date}`).join('; ');
    return { text: `${pregnant.length} pregnant sow records are active. Next recorded dates: ${next}.` };
  }

  if (/(sold|sales|revenue)/i.test(input)) {
    return { text: `${sales.length} sales are recorded this month, totaling ${money(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}.` };
  }

  const expenseMatch = input.match(/(?:add|record|create).*?(?:expense|spend).*?(\d+(?:\.\d+)?)/i);
  if (expenseMatch) {
    if (!isAllowed(role, FINANCIAL_ROLES)) return { text: 'You do not have permission to record expenses.' };
    const amount = Number(expenseMatch[1]);
    const category = /(feed)/i.test(input) ? 'Feed' : /(medicine|medical)/i.test(input) ? 'Medicine' : 'Other';
    return { text: `I prepared a ${money(amount)} ${category.toLowerCase()} expense. Please confirm before I record it.`, action: { type: 'add_expense', amount, category, description: input.trim(), date: today() } };
  }

  if (/(expense|spent|cost|profit)/i.test(input)) {
    if (!isAllowed(role, FINANCIAL_ROLES)) return { text: 'Financial records are restricted to administrators and managers.' };
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const revenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    if (/(profit|earning|net)/i.test(input)) return { text: `Recorded revenue this month is ${money(revenue)}, expenses are ${money(totalExpenses)}, and the operating result is ${money(revenue - totalExpenses)}.` };
    return { text: `Recorded expenses this month total ${money(totalExpenses)}.` };
  }

  if (/(feed|stock|inventory)/i.test(input)) {
    const feeds = db.getFeedItems();
    const low = feeds.filter((feed) => feed.quantity <= feed.min_stock);
    return { text: `${feeds.length} feed items are recorded. Current stock: ${feeds.map((feed) => `${feed.name} ${feed.quantity} ${feed.unit}`).join(', ') || 'none'}.${low.length ? ` Low stock: ${low.map((feed) => feed.name).join(', ')}.` : ' No feed items are below minimum stock.'}` };
  }

  return { text: "I can answer questions about livestock, breeding, health records, feed, sales, expenses, profit, and farm summaries. For an action, include the record ID and the required amount or weight." };
}

export function executeAssistantAction(action: AssistantAction, role: UserRole): AssistantResult {
  try {
    if (action.type === 'record_weight') {
      const pig = db.getPigById(action.pigId);
      if (!pig) throw new Error('Pig record not found');
      const weight = db.addWeight({ pig_id: pig.id, record_date: action.date, weight: action.weight, notes: action.notes });
      audit('record_weight', pig.pig_id, true);
      return { text: `Weight recorded successfully. ${pig.pig_id} is now recorded at ${weight.weight} kg.`, refresh: true };
    }
    if (!isAllowed(role, FINANCIAL_ROLES)) return { text: 'You do not have permission to record expenses.' };
    const expense = db.addExpense({
      date: action.date,
      category: action.category,
      amount: action.amount,
      description: action.description,
      payment_method: 'Cash' as PaymentMethod,
    });
    audit('create_expense', expense.id, true);
    return { text: `Expense recorded successfully: ${money(expense.amount)} for ${expense.category}.`, refresh: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'database operation failed';
    audit(action.type, 'unknown', false, message);
    return { text: `I couldn't complete that action. No record was created. ${message}` };
  }
}