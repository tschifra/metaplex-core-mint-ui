import Link from 'next/link';

export default function Custom404() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#08080c',
      padding: '16px',
    }}>
      <div style={{
        padding: '32px',
        borderRadius: '20px',
        background: 'rgba(15, 15, 25, 0.95)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6)',
        maxWidth: '500px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          404
        </h1>
        <h2 style={{
          color: 'white',
          fontSize: '1.5rem',
          marginBottom: '16px',
        }}>
          Page Not Found
        </h2>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '24px',
        }}>
          The page you are looking for does not exist.
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '12px 24px',
          fontWeight: '600',
          textDecoration: 'none',
          transition: 'all 0.3s ease',
        }}>
          Go Home
        </Link>
      </div>
    </div>
  );
}
