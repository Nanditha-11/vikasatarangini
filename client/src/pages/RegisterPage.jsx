import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export function RegisterPage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // District/Place Data (Telangana Districts)
  const districts = [
    "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", "Jagtial", 
    "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", 
    "Karimnagar", "Khammam", "Kumuram Bheem", "Mahabubabad", "Mahabubnagar", 
    "Mancherial", "Medak", "Medchal–Malkajgiri", "Mulugu", "Nagarkurnool", 
    "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", 
    "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", 
    "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri", "Main"
  ];

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [typedPlace, setTypedPlace] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: ""
  });

  async function onRegister(e) {
    e.preventDefault();
    if (!selectedDistrict || !typedPlace.trim()) {
      return setError("Please select a District and enter your Place");
    }
    setError("");
    const formattedPlace = typedPlace.trim().charAt(0).toUpperCase() + typedPlace.trim().slice(1);
    
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData,
          district: selectedDistrict, 
          place: formattedPlace
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="login-page-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '4em', marginBottom: '20px' }}>✅</div>
          <h2 style={{ marginBottom: '16px' }}>Registration Submitted!</h2>
          <p className="muted" style={{ marginBottom: '24px' }}>
            Your account is now pending approval. Please contact the Master Admin to activate your account.
          </p>
          <button 
            className="btn" 
            onClick={() => nav("/login")} 
            style={{ 
              width: '100%', 
              padding: '14px', 
              background: 'linear-gradient(135deg, #0d2866, #0072ff)', 
              color: 'white', 
              border: 'none', 
              fontWeight: 'bold' 
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-wrapper">
      <img src="/image1.jpg" alt="Left side" className="login-side-image" />

      <div className="login-card-container" style={{ width: '100%', maxWidth: '480px', zIndex: 2 }}>
        <div className="card">
          <h2 style={{ textAlign: "center", marginBottom: 6, fontStyle: "italic", fontSize: '2.4em', color: '#0d2866', fontWeight: '900' }}>
            Join Vikasa Tarangini
          </h2>
          <h3 style={{ textAlign: "center", marginBottom: 24, color: '#475569', fontSize: '1.2em', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
            Admin Registration
          </h3>

          {error && <div className="error">{error}</div>}

          <form onSubmit={onRegister} style={{ marginTop: 12 }}>
            <div className="field">
              <label>District</label>
              <select
                className="input"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                required
                style={{ appearance: 'auto', paddingRight: '30px' }}
              >
                <option value="">-- Select District --</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Place Name</label>
              <input
                className="input"
                value={typedPlace}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setTypedPlace(val.charAt(0).toUpperCase() + val.slice(1));
                  } else {
                    setTypedPlace("");
                  }
                }}
                placeholder="Type your village/town name"
                required
                disabled={!selectedDistrict}
              />
            </div>

            <div className="field">
              <label>Username</label>
              <input
                className="input"
                value={formData.username}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setFormData({...formData, username: val.charAt(0).toUpperCase() + val.slice(1)});
                  } else {
                    setFormData({...formData, username: ""});
                  }
                }}
                placeholder="Choose a username"
                required
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter Email"
                required
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Create a password"
                required
                autoComplete="new-password"
              />
              <p className="muted" style={{ fontSize: '0.85em', marginTop: '5px' }}>
                Require: 8+ characters, letters, numbers, and special chars.
              </p>
            </div>

            <div className="field">
              <label>WhatsApp Group Link</label>
              <input
                className="input"
                value={formData.whatsappLink || ""}
                onChange={(e) => setFormData({...formData, whatsappLink: e.target.value})}
                placeholder="https://chat.whatsapp.com/..."
              />
              <p className="muted" style={{ fontSize: '0.85em', marginTop: '5px' }}>
                Optional: Provide the WhatsApp group link for your district.
              </p>
            </div>

            <button 
              className="btn" 
              disabled={busy} 
              style={{ 
                width: "100%", 
                padding: '16px', 
                fontSize: '1.2em', 
                marginTop: '10px', 
                background: 'linear-gradient(135deg, #0d2866, #0072ff)', 
                color: 'white', 
                border: 'none', 
                fontWeight: 'bold', 
                letterSpacing: '1px',
                boxShadow: '0 10px 20px rgba(13, 40, 102, 0.2)',
                justifyContent: 'center'
              }}
            >
              {busy ? "Registering..." : "Register"}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, padding: '15px 0', borderTop: '1px solid #eee' }}>
            <p style={{ margin: 0, fontSize: '1.1em', textAlign: 'center' }}>
              Already have an account? <Link to="/login" style={{ color: '#0d2866', fontWeight: 'bold' }}>Login Here</Link>
            </p>
          </div>
        </div>
      </div>

      <img src="/image2.jpg" alt="Right side" className="login-side-image" />
    </div>
  );
}
