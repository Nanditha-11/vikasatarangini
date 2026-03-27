import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import presidentImg from '../assets/president.jpg';

export function AboutPage() {
  const [searchParams] = useSearchParams();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const isMaster = user?.role === "master";

  const currentPlace = isMaster ? (searchParams.get("place") || "Main") : (user?.place || "Main");
  const branchName = currentPlace === "Main" ? "Vikasa Tarangini" : `${currentPlace.charAt(0).toUpperCase() + currentPlace.slice(1)} Vikasa Tarangini`;

  return (
    <Layout title={branchName}>
      <div className="card" style={{ padding: 'min(40px, 5vw)', lineHeight: '1.6', color: '#374151' }}>

        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#1e3a8a', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '8px' }}>{branchName}</h1>
          <div style={{ width: '100px', height: '4px', background: 'linear-gradient(to right, #3b82f6, #60a5fa)', margin: '15px auto', borderRadius: '2px' }}></div>
        </div>

        <div className="about-grid" style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>

          {/* President Profile Card */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '24px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            border: '1px solid #f1f5f9',
            textAlign: 'center',
            height: 'fit-content',
            width: '100%',
            maxWidth: '350px'
          }}>
            <div style={{ position: 'relative', margin: '0 auto 15px' }}>
              <img
                src={presidentImg}
                alt="Yathipathi Arun Kumar"
                style={{
                  width: '100%',
                  maxWidth: '180px',
                  height: 'auto',
                  borderRadius: '12px',
                  objectFit: 'contain',
                  border: '4px solid #fff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}
              />
            </div>

            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.3rem', color: '#1e3a8a' }}>Yathipathi Arun Kumar</h3>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '1.1rem' }}>President</p>
            <p style={{ margin: '8px 0 0 0', color: '#000000', fontSize: '1.1rem', fontWeight: '500' }}>{branchName}</p>
            <p style={{ margin: '15px 0 0 0', fontWeight: 'bold', color: '#1e3a8a', fontSize: '1.1rem' }}>
              📞 9848118182
            </p>
          </div>
        </div>

        {/* Footer Credit Banner */}
        <div style={{
          marginTop: '30px',
          padding: '25px 30px',
          background: 'linear-gradient(135deg, #dbeafe, #bae6fd)',
          margin: '30px calc(-1 * min(40px, 5vw)) -40px',
          color: '#1e3a8a',
          textAlign: 'center',
          borderTop: '1px solid #bae6fd',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px'
        }}>
          <div style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
            <div style={{ fontSize: '1rem', marginBottom: '8px' }}>Developed by</div>
            <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Adavelly Nanditha</div>
            <div style={{ fontSize: '1.4rem' }}>Yathipathi Sathyadarsahan</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
