import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { apiFetch } from "../lib/api";
import { todayParts, toIsoDate } from "../lib/date";

export function useAttendance(initialDate, viewDistrict, viewPlace) {
  const [date, setDate] = useState(initialDate || toIsoDate(todayParts().y, todayParts().m, todayParts().d));
  const lastLoadedDate = useRef(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null);
  const [openingStock, setOpeningStock] = useState(0);
  const [previousRemainingStock, setPreviousRemainingStock] = useState(0);
  const [prevStockStats, setPrevStockStats] = useState({ opening: 0, sold: 0 });
  const [message, setMessage] = useState("Jai Srimannarayana! Thank you for attending the session today.");
  const [whatsappLink, setWhatsappLink] = useState("");

  const load = useCallback(async (d, vDist, vPlace) => {
    setBusy(true);
    setError("");
    try {
      let url = `/api/attendance/${encodeURIComponent(d)}`;
      const params = new URLSearchParams();
      if (vDist) params.append("district", vDist);
      if (vPlace) params.append("place", vPlace);
      if (params.toString()) url += `?${params.toString()}`;

      const data = await apiFetch(url);
      setRows(data.students || []);
      setInfo({
        total: data.total,
        presentCount: data.presentCount,
        absentCount: data.absentCount,
        newStudents: data.newStudents || [],
      });
      
      // Update message/link if provided by server, otherwise keep current state
      if (data.message && data.message !== message) setMessage(data.message);
      if (data.whatsappLink && data.whatsappLink !== whatsappLink) setWhatsappLink(data.whatsappLink);
      lastLoadedDate.current = d;
      
      const prevRem = data.previousRemainingStock || 0;
      setPreviousRemainingStock(prevRem);
      setPrevStockStats({ opening: data.previousOpeningStock || 0, sold: data.previousSoldStock || 0 });
      let currOpening = data.openingStock || 0;
      if (!data.hasAttendance && currOpening === 0) currOpening = prevRem;
      setOpeningStock(currOpening);
    } catch (err) {
      setError(err.message || "Failed to load attendance");
      setRows([]);
      setInfo(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const save = async (showToast = false, overrideRows = null) => {
    setBusy(true);
    setError("");
    try {
      const targetRows = overrideRows || rows;
      const presentStudents = targetRows.filter(r => r.present).map((s) => ({
        slNo: s.slNo,
        paymentMethod: s.paymentMethod || "Cash",
        quantity: s.quantity || 0,
        remark: s.remark || "",
      }));

      let saveUrl = `/api/attendance/${encodeURIComponent(date)}/save`;
      const params = new URLSearchParams();
      if (viewDistrict) params.append("district", viewDistrict);
      if (viewPlace) params.append("place", viewPlace);
      if (params.toString()) saveUrl += `?${params.toString()}`;

      await apiFetch(saveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentStudents, message, whatsappLink, openingStock }),
      });
      return true;
    } catch (err) {
      setError(err.message || "Save failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialDate && initialDate !== date) {
      setDate(initialDate);
    }
  }, [initialDate, setDate, date]);

  useEffect(() => {
    if (date) load(date, viewDistrict, viewPlace);
  }, [date, load, viewDistrict, viewPlace]);

  return {
    date, setDate,
    rows, setRows,
    busy, setBusy,
    error, setError,
    info,
    openingStock, setOpeningStock,
    previousRemainingStock,
    prevStockStats,
    message, setMessage,
    whatsappLink, setWhatsappLink,
    load,
    save
  };
}
