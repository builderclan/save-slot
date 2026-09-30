"use client";

import * as React from "react";
import { eventService } from "@/lib/data/store";
import { Community } from "@/types/database";
import Link from "next/link";
import { 
  ArrowLeft, 
  Globe, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Mail, 
  User, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export default function AdminCommunitiesPage() {
  const [version, setVersion] = React.useState(0);
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"pending" | "approved" | "rejected">("pending");

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [selectedCommId, setSelectedCommId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    eventService
      .getCommunities({ all: true })
      .then((data) => {
        if (isMounted) setCommunities(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load communities");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [version]);

  const pendingList = communities.filter((c) => c.status === "pending");
  const approvedList = communities.filter((c) => c.status === "approved");
  const rejectedList = communities.filter((c) => c.status === "rejected");

  const handleApprove = async (comm: Community) => {
    setIsProcessing(true);
    setActionSuccessMessage(null);
    try {
      await eventService.updateCommunityStatus(comm.id, "approved");
      setActionSuccessMessage(`Successfully approved "${comm.name}". Organizer lead privileges granted.`);
      refresh();
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve community");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRejectModal = (comm: Community) => {
    setSelectedCommId(comm.id);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedCommId) return;
    setIsProcessing(true);
    setActionSuccessMessage(null);
    try {
      const reason = rejectionReason.trim() || "Application declined by campus administration";
      await eventService.updateCommunityStatus(selectedCommId, "rejected", reason);
      setRejectModalOpen(false);
      setSelectedCommId(null);
      setActionSuccessMessage("Application rejected.");
      refresh();
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject community");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Campus Organization Moderation
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Community & Club Applications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review onboarding requests from student groups, assign organizer privileges, and manage approved organizations.
          </p>
        </div>

        <Link
          href="/join"
          target="_blank"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
        >
          View Public /join Form
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          {actionSuccessMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 -mb-px ${
            activeTab === "pending"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Pending Requests
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              pendingList.length > 0
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {pendingList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("approved")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 -mb-px ${
            activeTab === "approved"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Approved Organizations
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {approvedList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("rejected")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 -mb-px ${
            activeTab === "rejected"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <XCircle className="h-3.5 w-3.5" />
          Rejected / Suspended
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            {rejectedList.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 animate-pulse">
          <p className="text-sm font-semibold text-slate-700">Loading community requests...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 text-center rounded-2xl border border-red-200">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      ) : (
        <>
          {/* Tab 1: PENDING REQUESTS */}
          {activeTab === "pending" && (
            <div className="space-y-4">
              {pendingList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-slate-800">Queue Clear</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    There are no pending club or organization onboarding requests for this campus.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingList.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-5 bg-white rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 uppercase tracking-wider">
                              Pending Review
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">{comm.name}</h3>
                            <span className="text-xs text-slate-500">{comm.category}</span>
                          </div>

                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={comm.logo_url}
                            alt={comm.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {comm.description}
                        </p>

                        {/* Applicant Lead Information */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                          <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="h-3 w-3 text-blue-600" />
                            Applicant Contact
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Name:</span>
                            <span className="font-medium text-slate-900">
                              {comm.applicant_name || "Not specified"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Email:</span>
                            <span className="font-medium text-blue-600">
                              {comm.applicant_email || "Not specified"}
                            </span>
                          </div>
                        </div>

                        {(comm.website || comm.instagram) && (
                          <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                            {comm.website && (
                              <a
                                href={comm.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-slate-700 inline-flex items-center gap-1"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                <span className="text-[11px] truncate max-w-[150px]">{comm.website}</span>
                              </a>
                            )}
                            {comm.instagram && (
                              <span className="text-[11px] text-slate-500">{comm.instagram}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Moderation Actions */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          disabled={isProcessing}
                          onClick={() => handleOpenRejectModal(comm)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-50 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleApprove(comm)}
                          className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve Organization
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: APPROVED ORGANIZATIONS */}
          {activeTab === "approved" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedList.map((comm) => (
                <div
                  key={comm.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comm.logo_url}
                        alt={comm.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-2xs"
                      />
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        <Link href={`/communities/${comm.slug}`}>{comm.name}</Link>
                      </h3>
                      <span className="text-xs text-slate-500">{comm.category}</span>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {comm.description}
                      </p>
                    </div>

                    {comm.applicant_name && (
                      <div className="text-[11px] text-slate-400">
                        Lead: <span className="text-slate-600 font-medium">{comm.applicant_name}</span> ({comm.applicant_email})
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {comm.website && (
                        <a
                          href={comm.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-slate-700"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {comm.instagram && (
                        <span className="text-[11px] text-slate-500">{comm.instagram}</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenRejectModal(comm)}
                      className="px-3 py-1 text-xs font-medium border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50 transition"
                    >
                      Suspend
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: REJECTED / SUSPENDED */}
          {activeTab === "rejected" && (
            <div className="space-y-4">
              {rejectedList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <p className="text-xs text-slate-500">No rejected or suspended organizations.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rejectedList.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-5 bg-white rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Declined
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">{comm.name}</h3>
                            <span className="text-xs text-slate-500">{comm.category}</span>
                          </div>
                        </div>

                        {comm.rejection_reason && (
                          <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-xs text-rose-700">
                            <span className="font-semibold">Reason:</span> {comm.rejection_reason}
                          </div>
                        )}

                        {comm.applicant_name && (
                          <div className="text-xs text-slate-500">
                            Applicant: {comm.applicant_name} ({comm.applicant_email})
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
                        <button
                          onClick={() => handleApprove(comm)}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition"
                        >
                          Reconsider & Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
              <AlertCircle className="h-5 w-5" />
              Decline Community Application
            </div>

            <p className="text-xs text-slate-600">
              Provide a reason for declining or suspending this organization. This reason will be recorded for administrative audit.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Duplicate organization, invalid college email, or requires formal faculty endorsement..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-xl transition disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
