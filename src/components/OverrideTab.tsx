import React from 'react';
import { OverrideOperacionalForm } from './OverrideOperacionalForm';
import { Setor } from '../types/Setor';

export const OverrideTab: React.FC<{
  setores: Setor[];
  onUpdateSetor: (id: string, field: string, value: number) => void;
  currentUser: string;
}> = ({ setores, onUpdateSetor, currentUser }) => {
  return (
    <div className="animate-in p-6">
      <OverrideOperacionalForm
        setores={setores}
        onUpdateSetor={onUpdateSetor}
        currentUser={currentUser}
      />
    </div>
  );
};
