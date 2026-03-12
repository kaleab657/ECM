import React from 'react';
import { useAppContext } from '../context/AppContext';
import { LOGO_LIGHT, LOGO_DARK } from '../constants';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', onClick }) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer select-none ${className}`}
      onClick={onClick}
    >
      {!imageError && (
        <img 
          src="/assets/logo/logo.png" 
          alt="Ethio Cars Logo" 
          className="h-8 md:h-10 w-auto object-contain"
          onError={() => setImageError(true)}
        />
      )}
      {(imageError || !LOGO_LIGHT) && (
        <span className="font-black text-2xl md:text-3xl tracking-tighter italic flex items-center">
          <span className="text-zinc-900 dark:text-white">ETHIO</span>
          <span className="text-brand ml-1">CARS</span>
        </span>
      )}
    </div>
  );
};
