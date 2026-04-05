/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { GameEngine } from './engine/GameEngine';
import { TitleScene } from './game/scenes/TitleScene';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new GameEngine(canvasRef.current);
    engine.start(new TitleScene());
    
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container && canvasRef.current) {
        const scale = Math.min(
          container.clientWidth / 1280,
          container.clientHeight / 720
        );
        canvasRef.current.style.transform = `scale(${scale})`;
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="block origin-center"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
