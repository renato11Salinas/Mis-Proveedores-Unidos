import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { WorkflowStepInfo } from '../../types';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useState } from 'react';

interface RetrocederEtapaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStep?: WorkflowStepInfo;
  previousStep?: WorkflowStepInfo;
  onConfirm: (dni: string, motivo: string) => void;
}

export function RetrocederEtapaDialog({
  open,
  onOpenChange,
  currentStep,
  previousStep,
  onConfirm,
}: RetrocederEtapaDialogProps) {
  const [dni, setDni] = useState('');
  const [motivo, setMotivo] = useState('');

  if (!currentStep || !previousStep) return null;

  const handleConfirm = () => {
    onConfirm(dni, motivo);
    setDni('');
    setMotivo('');
  };

  const handleCancel = () => {
    setDni('');
    setMotivo('');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retroceder Etapa</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="text-red-600 font-semibold">
              Estás a punto de retroceder la orden de trabajo a la etapa anterior:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentStep.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{currentStep.name}</p>
                  <p className="text-sm text-gray-600">{currentStep.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-2">
                <div className="text-3xl text-red-600">↑</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{previousStep.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{previousStep.name}</p>
                  <p className="text-sm text-gray-600">{previousStep.description}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dni-retroceso">DNI/Código del Responsable</Label>
              <Input
                id="dni-retroceso"
                placeholder="Ingrese su DNI o código"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del Retroceso</Label>
              <Textarea
                id="motivo"
                placeholder="Indique el motivo por el cual retrocede la etapa..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Este retroceso quedará registrado en el historial de la orden.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Confirmar Retroceso
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
