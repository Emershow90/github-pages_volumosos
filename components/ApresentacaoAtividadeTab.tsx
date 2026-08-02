import React from 'react';
import { Setor } from '../types';
import { ConsoleOperacional } from './ConsoleOperacional';

interface ApresentacaoAtividadeTabProps {
  setores: Setor[];
  activeSectorId: string;
  onChangeSector: (id: string) => void;
}

export const ApresentacaoAtividadeTab: React.FC<ApresentacaoAtividadeTabProps> = ({
  setores,
  activeSectorId,
  onChangeSector
}) => {
  return (
    <ConsoleOperacional 
      setores={setores} 
      activeSectorId={activeSectorId} 
      onChangeSector={onChangeSector} 
    />
  );
};
