import React from 'react';

const VibeBackground = () => {
  return (
    <div className="vibe-container">
      <div className="aurora aurora-1"></div>
      <div className="aurora aurora-2"></div>
      <div className="aurora aurora-3"></div>
      <div className="aurora aurora-4"></div>
      
      <style>{`
        .vibe-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #010413;
          overflow: hidden;
          z-index: -1;
        }

        .aurora {
          position: absolute;
          filter: blur(100px);
          opacity: 0.7;
          mix-blend-mode: screen;
          animation: auroraMove 20s infinite alternate ease-in-out;
        }


        .aurora-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          top: -200px;
          left: -200px;
        }

        .aurora-2 {
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
          bottom: -300px;
          right: -200px;
          animation-delay: -5s;
        }

        .aurora-3 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #10b981 0%, transparent 70%);
          top: 20%;
          right: 10%;
          animation-delay: -10s;
        }

        .aurora-4 {
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, #f59e0b 0%, transparent 70%);
          bottom: 10%;
          left: 20%;
          animation-delay: -15s;
          opacity: 0.3;
        }

        @keyframes auroraMove {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(50px, 100px) scale(1.1) rotate(10deg); }
          66% { transform: translate(-50px, 50px) scale(0.9) rotate(-10deg); }
          100% { transform: translate(0, 0) scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default VibeBackground;
