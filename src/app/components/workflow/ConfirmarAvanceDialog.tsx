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
import { useState } from 'react';

interface ConfirmarAvanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStep?: WorkflowStepInfo;
  nextStep?: WorkflowStepInfo;
  onConfirm: (dni: string) => void;
}

export function ConfirmarAvanceDialog({
  open,
  onOpenChange,
  currentStep,
  nextStep,
  onConfirm,
}: ConfirmarAvanceDialogProps) {
  const [dni, setDni] = useState('');

  if (!currentStep || !nextStep) return null;

  const handleConfirm = () => {
    onConfirm(dni);
    setDni('');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Avance de Etapa</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Estás a punto de avanzar la orden de trabajo a la siguiente etapa:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentStep.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{currentStep.name}</p>
                  <p className="text-sm text-gray-600">{currentStep.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-2">
                <div className="text-3xl text-blue-600">↓</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{nextStep.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{nextStep.name}</p>
                  <p className="text-sm text-gray-600">{nextStep.description}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dni">DNI/Código del Responsable</Label>
              <Input
                id="dni"
                placeholder="Ingrese su DNI o código"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                Este cambio quedará registrado en el historial de la orden.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDni('')}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Confirmar Avance
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}