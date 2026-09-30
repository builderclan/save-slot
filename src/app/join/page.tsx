"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Globe, 
  Mail, 
  User 
} from "lucide-react";
import { Campus } from "@/types/database";

const CATEGORIES = [
  "Technology & Engineering",
  "Arts & Performance",
  "Academic & Professional",
  "Athletics & Recreation",
  "Culture & Diversity",
  "Social & Special Interest",
  "Student Government & Media",
];

export default function JoinCommunityPage() {
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
  const [selectedCampusId, setSelectedCampusId] = React.useState<string>("");
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [description, setDescription] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [instagram, setInstagram] = React.useState("");
  const [applicantName, setApplicantName] = React.useState("");
  const [applicantEmail, setApplicantEmail] = React.useState("");

  const [loadingCampuses, setLoadingCampuses] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successSubmitted, setSuccessSubmitted] = React.useState<boolean>(false);
  const [submittedData, setSubmittedData] = React.useState<{
    communityName: string;
    campusName: string;
    applicantEmail: string;
  } | null>(null);

  React.useEffect(() => {
    fetch("/api/campuses?all=true")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.campuses && data.campuses.length > 0) {
          setCampuses(data.campuses);
          setSelectedCampusId(data.campuses[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch campuses:", err);
      })
      .finally(() => {
        setLoadingCampuses(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic frontend validations
    if (!selectedCampusId) {
      setErrorMessage("Please select your campus.");
      return;
    }
    if (!name.trim()) {
      setErrorMessage("Please enter your community name.");
      return;
    }
    if (!category) {
      setErrorMessage("Please select a community category.");
      return;
    }
    if (!description.trim() || description.trim().length < 15) {
      setErrorMessage("Please provide a description of at least 15 characters.");
      return;
    }
    if (!applicantName.trim()) {
      setErrorMessage("Please provide your full name as applicant lead.");
      return;
    }
    if (!applicantEmail.trim() || !applicantEmail.includes("@")) {
      setErrorMessage("Please provide a valid college email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campus_id: selectedCampusId,
          name: name.trim(),
          category,
          description: description.trim(),
          website: website.trim() || undefined,
          instagram: instagram.trim() || undefined,
          applicant_name: applicantName.trim(),
          applicant_email: applicantEmail.trim().toLowerCase(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to submit community application.");
      }

      const activeCampus = campuses.find((c) => c.id === selectedCampusId);
      setSubmittedData({
        communityName: name.trim(),
        campusName: activeCampus?.name || "Campus",
        applicantEmail: applicantEmail.trim(),
      });
      setSuccessSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setWebsite("");
    setInstagram("");
    setApplicantName("");
    setApplicantEmail("");
    setSuccessSubmitted(false);
    setSubmittedData(null);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          Campus Community Onboarding
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Register Your Campus Club or Organization
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
          Get your student organization, athletic club, or academic department listed on the official
          Campus Calendar to reach students and publish campus events.
        </p>
      </div>

      {successSubmitted && submittedData ? (
        /* Success Card */
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed mb-6">
            Your request to register <strong className="text-slate-900">{submittedData.communityName}</strong> on{" "}
            <strong className="text-slate-900">{submittedData.campusName}</strong> has been submitted to campus
            administration for review.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2 border border-slate-100 mb-8">
            <div className="flex items-center justify-between text-slate-500">
              <span>Applicant:</span>
              <span className="font-semibold text-slate-800">{applicantName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Confirmation Email:</span>
              <span className="font-semibold text-slate-800">{submittedData.applicantEmail}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Status:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                Pending Review
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition inline-flex items-center justify-center gap-2"
            >
              Browse Campus Events
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
            >
              Register Another Organization
            </button>
          </div>
        </div>
      ) : (
        /* Application Form */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Submission failed</p>
                <p className="mt-0.5 text-xs text-red-600">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Section 1: Campus Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-semibold text-sm">
              <Building2 className="h-4 w-4 text-blue-600" />
              1. Campus Affiliation
            </div>

            <div>
              <label htmlFor="campusSelect" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Campus <span className="text-red-500">*</span>
              </label>
              {loadingCampuses ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading campuses...
                </div>
              ) : (
                <select
                  id="campusSelect"
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.domain || "campus"})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                Your community and events will be scoped to this campus.
              </p>
            </div>
          </div>

          {/* Section 2: Organization Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-semibold text-sm">
              <Users className="h-4 w-4 text-blue-600" />
              2. Organization Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="commName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Organization / Club Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="commName"
                  type="text"
                  placeholder="e.g. Apex Robotics Club"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label htmlFor="commCategory" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="commCategory"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="commDesc" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Description & Mission <span className="text-red-500">*</span>
              </label>
              <textarea
                id="commDesc"
                rows={3}
                placeholder="What does your club do? Who can participate? Mention regular meeting times or key focus areas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="commWeb" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Website or Linktree <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Globe className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="commWeb"
                    type="url"
                    placeholder="https://myclub.org"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="commInsta" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Instagram / Social Handle <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="commInsta"
                  type="text"
                  placeholder="@apexrobotics"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Applicant Lead Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-semibold text-sm">
              <User className="h-4 w-4 text-blue-600" />
              3. Applicant & Leadership Contact
            </div>
            <p className="text-xs text-slate-500">
              Upon approval, this person will be designated as the community lead with organizer privileges to manage events.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="leadName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="leadName"
                    type="text"
                    placeholder="Jane Doe (President / Officer)"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="leadEmail" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  College / Institutional Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="leadEmail"
                    type="email"
                    placeholder="officer@apex.edu"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Must be an institutional address (.edu, .ac, or campus domain).
                </p>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400 text-center sm:text-left">
              Applications are reviewed by Campus Administration.
            </p>

            <button
              type="submit"
              disabled={submitting || loadingCampuses}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
