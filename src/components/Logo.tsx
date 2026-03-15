import React from 'react';
import { useAppContext } from '../context/AppContext';
import { LOGO_LIGHT, LOGO_DARK } from '../constants';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', onClick }) => {
  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer select-none ${className}`}
      onClick={onClick}
    >
      <span className="font-black text-2xl md:text-3xl tracking-tighter italic flex items-center">
        <span className="text-zinc-900 dark:text-white">ETHIO</span>
        <span className="text-brand ml-1">CARS</span>
      </span>
    </div>
  );
};
