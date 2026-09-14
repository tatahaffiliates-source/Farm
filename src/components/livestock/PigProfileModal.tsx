import React, { useEffect, useState } from 'react';
import { Pig, PigWeight, HealthRecord, BreedingRecord, Sale } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { db } from '../../services/db';
import { createPigFileUrl, listPigFiles, PigFile, uploadPigFile } from '../../services/pigFiles';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  Scale,
  Activity,
  HeartHandshake,
  Receipt,
  Plus,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  FileText,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PigProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  pig: Pig | null;
  onRecordWeight: (pigId: string) => void;
  onRecordHealth: (pigId: string) => void;
  onPigUpdated: () => void;
}

export const PigProfileModal: React.FC<PigProfileModalProps> = ({
  isOpen,
  onClose,
  pig,
  onRecordWeight,
  onRecordHealth,
  onPigUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'weight' | 'health' | 'breeding' | 'financial' | 'files'>(
    'overview'
  );
  const { user, isSupabaseActive } = useAuth();
  const { success, error } = useToast();
  const [pigFiles, setPigFiles] = useState<PigFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  useEffect(() => {
    if (!isOpen || !pig || !isSupabaseActive) return;
    setIsLoadingFiles(true);
    listPigFiles(pig.id)
      .then(setPigFiles)
      .catch((err: Error) => error(err.message || 'Unable to load pig files.'))
      .finally(() => setIsLoadingFiles(false));
  }, [error, isOpen, isSupabaseActive, pig]);

  if (!pig) return null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user || !pig) return;

    setIsUploadingFile(true);
    try {
      const uploadedFile = await uploadPigFile(file, pig.id, user.farm_id);
      setPigFiles((current) => [uploadedFile, ...current]);
      success(`${file.name} uploaded successfully.`);
    } catch (err: any) {
      error(err.message || 'Unable to upload file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileDownload = async (file: PigFile) => {
    try {
      const url = await createPigFileUrl(file);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      error(err.message || 'Unable to open file.');
    }
  };

  // Calculate age in months and days
  const calculateAge = (dobString: string) => {
    const dob = new Date(dobString);
    const now = new Date();
    const diffMs = now.getTime() - dob.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30.4);
    const remainingDays = Math.floor(totalDays % 30.4);
    if (months === 0) return `${totalDays} days`;
    return `${months} mo ${remainingDays} d`;
  };

  const weights = db.getWeights(pig.id);
  const healthRecords = db.getHealthRecords(pig.id);
  const breedingRecords = db
    .getBreedingRecords()
    .filter((b) => b.sow_id === pig.id || b.boar_id === pig.id);

  // Financial calculations
  const sales = db.getSales().filter((s) => s.pig_id === pig.id);
  const totalSaleRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalMedicalCost = healthRecords.reduce((sum, h) => sum + (h.cost || 0), 0);
  const purchaseCost = pig.purchase_price || 0;
  const estimatedProfit = totalSaleRevenue > 0 ? totalSaleRevenue - (purchaseCost + totalMedicalCost) : null;

  // Weight chart data
  const weightChartData = weights.map((w) => ({
    date: w.record_date,
    weight: w.weight,
    gain: w.weight_gained || 0,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pig Record: ${pig.pig_id} (${pig.breed})`}
      subtitle={`Tag: ${pig.tag_number || 'N/A'} • Pen: ${pig.pen_location}`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Quick Header Summary Card */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
              {pig.sex === 'Male' ? '♂ Boar' : '♀ Sow'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-stone-900">{pig.pig_id}</span>
                <StatusBadge status={pig.status} />
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {pig.breed} • Born: {pig.dob} (Age: {calculateAge(pig.dob)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Current Weight</p>
              <p className="text-xl font-bold text-stone-900 font-mono">{pig.current_weight} kg</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Location</p>
              <p className="text-sm font-semibold text-stone-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {pig.pen_location}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRecordWeight(pig.id)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5 text-emerald-700" />
                Weigh
              </button>
              <button
                type="button"
                onClick={() => onRecordHealth(pig.id)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-rose-700" />
                Health
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 overflow-x-auto gap-1">
          {[
            { id: 'overview', label: 'Overview & Pedigree', icon: Layers },
            { id: 'weight', label: `Weight History (${weights.length})`, icon: Scale },
            { id: 'health', label: `Health Logs (${healthRecords.length})`, icon: Activity },
            { id: 'breeding', label: `Breeding & Parity (${breedingRecords.length})`, icon: HeartHandshake },
            { id: 'financial', label: 'Financial Performance', icon: Receipt },
            { id: 'files', label: `Files (${pigFiles.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2.5 px-3.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-700 text-emerald-800 font-semibold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Identification & Heritage</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400">Pig ID:</span>
                    <p className="font-semibold text-stone-800">{pig.pig_id}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Tag Number:</span>
                    <p className="font-semibold text-stone-800">{pig.tag_number || 'None'}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Breed:</span>
                    <p className="font-semibold text-stone-800">{pig.breed}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Sex:</span>
                    <p className="font-semibold text-stone-800">{pig.sex}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Sire (Father):</span>
                    <p className="font-semibold text-stone-800">{pig.father_tag || 'Unknown / External'}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Dam (Mother):</span>
                    <p className="font-semibold text-stone-800">{pig.mother_tag || 'Unknown / External'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Acquisition & Pen</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400">Source:</span>
                    <p className="font-semibold text-stone-800">{pig.source}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Purchase Date:</span>
                    <p className="font-semibold text-stone-800">{pig.purchase_date || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-stone-400">Purchase Price:</span>
                    <p className="font-semibold text-stone-800">
                      {pig.purchase_price ? `₹${pig.purchase_price.toLocaleString('en-IN')}` : 'Born on Farm'}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-400">Pen / Enclosure:</span>
                    <p className="font-semibold text-stone-800">{pig.pen_location}</p>
                  </div>
                </div>
              </div>
            </div>

            {pig.notes && (
              <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">Clinical & Operator Notes:</span>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">{pig.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Weight History & Growth Curve */}
        {activeTab === 'weight' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Growth Tracking & Weight Trend</h4>
                <p className="text-xs text-stone-500">Live bodyweight progress over time</p>
              </div>
              <button
                type="button"
                onClick={() => onRecordWeight(pig.id)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Weigh-in
              </button>
            </div>

            {weightChartData.length > 0 ? (
              <>
                <div className="h-56 w-full p-3 rounded-xl border border-stone-200 bg-white">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} unit="kg" />
                      <Tooltip
                        formatter={(val: any) => [`${val} kg`, 'Weight']}
                        contentStyle={{
                          backgroundColor: '#1c1917',
                          borderColor: '#292524',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#059669"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#059669' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Weight Log Table */}
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Weight (kg)</th>
                        <th className="p-3">Gain</th>
                        <th className="p-3">Growth %</th>
                        <th className="p-3">Recorded By</th>
                        <th className="p-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {weights.map((w) => (
                        <tr key={w.id} className="hover:bg-stone-50">
                          <td className="p-3 font-medium text-stone-900">{w.record_date}</td>
                          <td className="p-3 font-mono font-bold text-stone-900">{w.weight} kg</td>
                          <td className="p-3">
                            {w.weight_gained !== undefined && w.weight_gained > 0 ? (
                              <span className="font-semibold text-emerald-700">+{w.weight_gained} kg</span>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            {w.growth_rate !== undefined && w.growth_rate > 0 ? (
                              <span className="font-semibold text-emerald-700">+{w.growth_rate}%</span>
                            ) : (
                              <span className="text-stone-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-stone-500">{w.recorded_by || 'Staff'}</td>
                          <td className="p-3 text-stone-500">{w.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-stone-500 text-center py-8">No weight entries recorded yet.</p>
            )}
          </div>
        )}

        {/* Tab 3: Health History */}
        {activeTab === 'health' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900">Veterinary & Treatment Logs</h4>
              <button
                type="button"
                onClick={() => onRecordHealth(pig.id)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Health Record
              </button>
            </div>

            {healthRecords.length > 0 ? (
              <div className="space-y-2.5">
                {healthRecords.map((h) => (
                  <div key={h.id} className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{h.condition}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {h.type}
                        </span>
                      </div>
                      <span className="text-xs text-stone-400">{h.record_date}</span>
                    </div>
                    {h.treatment && <p className="text-xs text-stone-700 font-medium">{h.treatment}</p>}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                      {h.medicine_name && <span>Medicine: <strong className="text-stone-800">{h.medicine_name} ({h.dosage || 'Standard'})</strong></span>}
                      {h.veterinarian && <span>Vet: <strong className="text-stone-800">{h.veterinarian}</strong></span>}
                      {h.cost > 0 && <span>Cost: <strong className="text-stone-800">₹{h.cost}</strong></span>}
                      {h.follow_up_date && <span>Follow-up: <strong className="text-amber-700">{h.follow_up_date}</strong></span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 text-center py-8">No medical or vaccination records logged.</p>
            )}
          </div>
        )}

        {/* Tab 4: Breeding & Reproduction History */}
        {activeTab === 'breeding' && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-stone-900">Mating, Pregnancy & Farrowing History</h4>
            {breedingRecords.length > 0 ? (
              <div className="space-y-2">
                {breedingRecords.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl border border-stone-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-stone-900">
                          {pig.sex === 'Female' ? `Mated with Boar: ${b.boar_tag || 'Stud'}` : `Mated with Sow: ${b.sow_tag}`}
                        </span>
                        <p className="text-[11px] text-stone-500">
                          Mating Date: {b.mating_date} • Expected Farrowing: {b.expected_delivery_date}
                        </p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    {b.notes && <p className="text-xs text-stone-600 mt-2">{b.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 text-center py-8">No breeding cycles recorded for this animal.</p>
            )}
          </div>
        )}

        {/* Tab 5: Financial Performance */}
        {activeTab === 'financial' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-stone-900">Individual Pig Financial Ledger</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
                <span className="text-[11px] font-semibold text-stone-400 uppercase">Purchase Cost</span>
                <p className="text-lg font-bold text-stone-900 font-mono mt-0.5">
                  ₹{purchaseCost.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
                <span className="text-[11px] font-semibold text-stone-400 uppercase">Medical & Vet Outlay</span>
                <p className="text-lg font-bold text-rose-700 font-mono mt-0.5">
                  ₹{totalMedicalCost.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
                <span className="text-[11px] font-semibold text-stone-400 uppercase">Sale Revenue</span>
                <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                  {totalSaleRevenue > 0 ? `₹${totalSaleRevenue.toLocaleString('en-IN')}` : 'Unsold (Active Asset)'}
                </p>
              </div>
            </div>

            {estimatedProfit !== null && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Net Realized Profit</span>
                  <p className="text-xs text-emerald-700 mt-0.5">Sale price minus initial purchase & veterinary care</p>
                </div>
                <p className="text-2xl font-bold font-mono text-emerald-800">
                  ₹{estimatedProfit.toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Pig Files</h4>
                <p className="text-xs text-stone-500">Private photos, documents, and veterinary records for this animal.</p>
              </div>
              {isSupabaseActive && (
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer">
                  {isUploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {isUploadingFile ? 'Uploading...' : 'Upload file'}
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    disabled={isUploadingFile}
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            {!isSupabaseActive ? (
              <p className="text-xs text-stone-500 text-center py-8 border border-dashed border-stone-300 rounded-xl">
                Connect Supabase to upload and view private pig files.
              </p>
            ) : isLoadingFiles ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading files...
              </div>
            ) : pigFiles.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-8 border border-dashed border-stone-300 rounded-xl">
                No files uploaded for this pig yet.
              </p>
            ) : (
              <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
                {pigFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">{file.file_name}</p>
                        <p className="text-[11px] text-stone-500">
                          {(file.file_size / 1024 / 1024).toFixed(2)} MB · {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileDownload(file)}
                      className="p-1.5 rounded-md text-stone-500 hover:bg-stone-100 hover:text-emerald-700"
                      title="Open file"
                      aria-label={`Open ${file.file_name}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </div>
    </Modal>
  );
};
