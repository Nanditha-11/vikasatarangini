import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function PaymentPage() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId") || "";

  useEffect(() => {
    if (studentId) {
      // Redirect old QR codes directly to the dashboard's auto-mark feature
      window.location.replace(`/?mark=${studentId}`);
    } else {
      window.location.replace(`/`);
    }
  }, [studentId]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px', fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ color: '#64748b' }}>Opening student details...</p>
    </div>
  );
}
