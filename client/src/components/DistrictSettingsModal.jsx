import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";

export function DistrictSettingsModal({ admin, onClose, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState({
    whatsappLink: "",
    welcomeMessage: "",
    inviteTemplate: ""
  });

  useEffect(() => {
    // Fetch the config for this specific admin via their username
    const url = `/api/location-config?username=${encodeURIComponent(admin.username)}`;
    apiFetch(url).then(setConfig).catch(console.error);
  }, [admin]);

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch("/api/location-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          username: admin.username
        }),
      });
      alert("Settings saved successfully!");
      onClose();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content card" style={{ maxWidth: '500px', width: '90%' }}>
        <h2 style={{ marginBottom: '10px' }}>District Settings</h2>
        <p className="muted" style={{ marginBottom: '20px' }}>
          Configuring for: <b>{admin.district} / {admin.place}</b>
        </p>

        <form onSubmit={handleSave}>
          <div className="field">
            <label>WhatsApp Group Link</label>
            <input 
              className="input" 
              value={config.whatsappLink} 
              onChange={e => setConfig({ ...config, whatsappLink: e.target.value })} 
              placeholder="https://chat.whatsapp.com/..."
            />
          </div>

          <div className="field">
            <label>Default Welcome Message</label>
            <textarea 
              className="input" 
              style={{ minHeight: '80px' }}
              value={config.welcomeMessage} 
              onChange={e => setConfig({ ...config, welcomeMessage: e.target.value })} 
            />
          </div>

          <div className="field">
            <label>Invitation Template (Use {"{{name}}"} and {"{{link}}"})</label>
            <textarea 
              className="input" 
              style={{ minHeight: '100px' }}
              value={config.inviteTemplate} 
              onChange={e => setConfig({ ...config, inviteTemplate: e.target.value })} 
            />
          </div>

          <div className="row" style={{ marginTop: '20px', gap: '10px' }}>
            <button type="submit" className="btn primary" disabled={busy} style={{ flex: 1 }}>
              {busy ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
