'use client';

import React, { useMemo } from 'react';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { fmtINR, fmtMult, fmtPct } from '@/lib/utils/formatters';

interface TearSheetReportProps {
  userId: string;
  companyProfileId: string;
}

export function TearSheetReport({ userId, companyProfileId }: TearSheetReportProps) {
  const firestore = useFirestore();

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return doc(firestore, 'users', userId, 'companyProfiles', companyProfileId);
  }, [firestore, userId, companyProfileId]);

  const shareholdersRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'shareholders');
  }, [firestore, userId, companyProfileId]);

  const fundingRoundsRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return query(collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'fundingRounds'), orderBy('date', 'desc'));
  }, [firestore, userId, companyProfileId]);

  const { data: profile } = useDoc(profileRef) || {};
  const { data: shareholdersData } = useCollection(shareholdersRef) || {};
  const { data: fundingRounds } = useCollection(fundingRoundsRef) || {};

  const shareholders = useMemo(() => {
    if (!shareholdersData) return [];
    return shareholdersData.map(sh => ({
      id: sh.id,
      name: sh.name || 'Unknown',
      role: sh.role || 'Investor',
      ownership: Number(sh.ownershipPercentage) || 0,
      invested: Number(sh.investmentAmount) || 0,
      preferenceType: sh.preferenceType || (sh.role === 'Founder' ? 'common' : '1x_non_part')
    })).sort((a, b) => b.ownership - a.ownership);
  }, [shareholdersData]);

  const currentExitValue = profile?.postMoneyValuation || profile?.latestValuation || 0;

  const waterfallResults = useMemo(() => {
    let remainingPool = currentExitValue;
    
    // Step 1: Calculate preferences
    const preferences = shareholders.map(sh => {
      let prefAmount = 0;
      if (sh.preferenceType === '1x_non_part' || sh.preferenceType === '1x_part') {
        prefAmount = sh.invested;
      } else if (sh.preferenceType === '2x_part') {
        prefAmount = sh.invested * 2;
      }
      return { ...sh, prefAmount };
    });

    const totalPreferenceDemand = preferences.reduce((sum, sh) => sum + sh.prefAmount, 0);
    
    // Early exit
    if (remainingPool <= totalPreferenceDemand && totalPreferenceDemand > 0) {
      return preferences.map(sh => {
        const payout = (sh.prefAmount / totalPreferenceDemand) * remainingPool;
        return {
          ...sh,
          payout,
          payoutType: 'Preference Capped',
          effectiveOwnership: currentExitValue > 0 ? (payout / currentExitValue) * 100 : 0
        };
      });
    }

    remainingPool -= totalPreferenceDemand;

    let commonOwnershipBase = 0;
    const intermediate = preferences.map(sh => {
      const proRataGross = (sh.ownership / 100) * currentExitValue;
      let convertsToCommon = false;
      if (sh.preferenceType === '1x_non_part' && proRataGross > sh.prefAmount) {
        convertsToCommon = true;
        remainingPool += sh.prefAmount;
        sh.prefAmount = 0;
      }
      if (sh.preferenceType === 'common' || sh.preferenceType === '1x_part' || sh.preferenceType === '2x_part' || convertsToCommon) {
        commonOwnershipBase += sh.ownership;
      }
      return { ...sh, convertsToCommon, proRataGross };
    });

    return intermediate.map(sh => {
      let commonShare = 0;
      if (sh.preferenceType === 'common' || sh.preferenceType === '1x_part' || sh.preferenceType === '2x_part' || sh.convertsToCommon) {
        const adjustedOwnership = commonOwnershipBase > 0 ? (sh.ownership / commonOwnershipBase) : 0;
        commonShare = remainingPool * adjustedOwnership;
      }

      const payout = sh.prefAmount + commonShare;
      return {
        ...sh,
        payout,
        effectiveOwnership: currentExitValue > 0 ? (payout / currentExitValue) * 100 : 0,
        payoutType: sh.convertsToCommon ? 'Converted to Common' : (sh.preferenceType.includes('part') && commonShare > 0 ? 'Participating' : (sh.prefAmount > 0 ? 'Preference' : 'Common'))
      };
    });
  }, [currentExitValue, shareholders]);

  if (!profile) return null;

  const arr = (profile.mRevenue || 0) * 12;
  const ltv = (profile.profitPerOrder || 0) * (profile.ordersPerCustomer || 1);
  const ltvCac = profile.cac > 0 ? ltv / profile.cac : 0;
  const runway = profile.burnRate > 0 ? (profile.cashBank || 0) / profile.burnRate : 999;
  
  const preMoney = Math.max(0, currentExitValue - (profile.investment || 0));

  return (
    <div className="hidden print:block print:w-[210mm] print:min-h-[297mm] text-black font-sans bg-white mx-auto">
      <div className="p-10 space-y-12">
        {/* HEADER */}
        <div className="border-b-4 border-slate-900 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-900 mb-2">
              {profile.companyName || 'Unnamed Startup'}
            </h1>
            <p className="text-md font-bold text-slate-500 uppercase tracking-widest">
              Comprehensive Diligence Report
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800 capitalize text-lg">Stage: {profile.stage || 'N/A'}</p>
            <p className="font-bold text-slate-800 capitalize text-lg">Sector: {profile.industry || 'N/A'}</p>
          </div>
        </div>

        {/* 1. UNIT ECONOMICS AND VALUATION */}
        <section>
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-2 mb-6 text-primary">1. Valuation & Unit Economics</h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-slate-50 border-2 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Valuation</p>
              <p className="text-xl font-code font-black text-slate-900">{fmtINR(currentExitValue)}</p>
              <p className="text-[9px] text-slate-600 font-bold mt-1 uppercase">Pre: {fmtINR(preMoney)}</p>
            </div>
            <div className="p-4 bg-slate-50 border-2 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">ARR</p>
              <p className="text-xl font-code font-black text-slate-900">{fmtINR(arr)}</p>
              <p className="text-[9px] text-slate-600 font-bold mt-1 uppercase">Growth: {profile.growthRate || 0}% MoM</p>
            </div>
            <div className="p-4 bg-slate-50 border-2 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Runway</p>
              <p className="text-xl font-code font-black text-slate-900">{runway === 999 ? '∞' : `${Math.round(runway)} Mo`}</p>
              <p className="text-[9px] text-slate-600 font-bold mt-1 uppercase">Burn: {fmtINR(profile.burnRate || 0)}</p>
            </div>
            <div className="p-4 bg-slate-50 border-2 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Efficiency</p>
              <p className="text-xl font-code font-black text-slate-900">{fmtMult(ltvCac)} LTV/CAC</p>
              <p className="text-[9px] text-slate-600 font-bold mt-1 uppercase">Profit/Cust: {fmtINR(ltv - (profile.cac || 0))}</p>
            </div>
          </div>
        </section>

        {/* 2. CAP TABLE SUMMARY */}
        <section className="break-inside-avoid">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-2 mb-6 text-primary">2. Cap Table Breakdown</h2>
          <table className="w-full text-base border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-[10px] uppercase font-black text-slate-500 bg-slate-50">
                <th className="p-3 w-1/3">Shareholder</th>
                <th className="p-3 w-1/4">Role</th>
                <th className="p-3 text-right">Ownership</th>
                <th className="p-3 text-right">Invested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-b-2 border-slate-300">
              {shareholders.length > 0 ? (
                shareholders.map((sh) => (
                  <tr key={sh.id}>
                    <td className="p-3 font-bold text-slate-900">{sh.name}</td>
                    <td className="p-3 text-xs font-bold text-slate-500 tracking-widest uppercase">{sh.role}</td>
                    <td className="p-3 text-right font-code font-black text-slate-800">{fmtPct(sh.ownership)}</td>
                    <td className="p-3 text-right font-code font-medium text-slate-600">{fmtINR(sh.invested)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-sm font-bold text-slate-400 italic">No shareholders registered.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 3. EXIT SIMULATION WATERFALL */}
        <section className="break-inside-avoid">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-2 mb-6 text-primary">3. Simulated Exit Waterfall (@ {fmtINR(currentExitValue)})</h2>
          <table className="w-full text-base border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-[10px] uppercase font-black text-slate-500 bg-slate-50">
                <th className="p-3">Shareholder</th>
                <th className="p-3">Pref. Terms</th>
                <th className="p-3 text-right">Realized Cash</th>
                <th className="p-3 text-right">Effective Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-b-2 border-slate-300">
              {waterfallResults.length > 0 ? (
                waterfallResults.map((res) => (
                  <tr key={res.id}>
                    <td className="p-3 font-bold text-slate-900">
                      {res.name}
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{res.payoutType}</div>
                    </td>
                    <td className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{res.preferenceType.replace(/_/g, ' ')}</td>
                    <td className="p-3 text-right font-code font-black text-slate-900">{fmtINR(res.payout)}</td>
                    <td className={`p-3 text-right font-code font-black ${res.effectiveOwnership < res.ownership - 0.1 ? 'text-red-600' : 'text-green-600'}`}>
                      {res.effectiveOwnership.toFixed(1)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-sm font-bold text-slate-400 italic">No data to simulate.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 4. FUNDING HISTORY */}
        <section className="break-inside-avoid">
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-2 mb-6 text-primary">4. Capital Raised History</h2>
          <div className="space-y-4">
            {fundingRounds && fundingRounds.length > 0 ? (
              fundingRounds.map((round) => (
                <div key={round.id} className="flex justify-between items-center p-4 border-2 border-slate-200 rounded-lg bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{round.roundName || 'Seed/Angel Round'}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {round.date ? new Date(round.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : 'Unknown Date'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-code font-black text-slate-900">{fmtINR(Number(round.amountRaised) || 0)}</p>
                    <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">Dilution: {fmtPct(Number(round.equityOffered) || 0)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-bold text-slate-400 italic text-center p-6 border-2 border-dashed rounded-lg">No funding rounds added to history.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
