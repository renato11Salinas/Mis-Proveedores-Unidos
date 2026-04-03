import { WorkflowStep } from '../../types';
import { workflowSteps } from '../../data/mockData';
import { Check } from 'lucide-react';

interface WorkflowProgressProps {
  currentStep: WorkflowStep;
}

export function WorkflowProgress({ currentStep }: WorkflowProgressProps) {
  const currentIndex = workflowSteps.findIndex(step => step.id === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-center sm:justify-between relative px-4">
        {/* Progress line */}
        <div className="hidden sm:block absolute top-5 left-4 right-4 h-1 bg-gray-300 -z-10">
          <div
            className="h-full bg-green-600 transition-all duration-500"
            style={{ width: `${(currentIndex / (workflowSteps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {workflowSteps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className={`flex-col items-center ${isCurrent ? 'flex' : 'hidden sm:flex'}`}>
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2 transition-all shadow-sm
                  ${isCompleted ? 'bg-green-600 text-white shadow-green-200' : ''}
                  ${isCurrent ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white scale-125 shadow-2xl shadow-blue-300 animate-pulse ring-4 ring-blue-300 ring-opacity-50' : ''}
                  ${isPending ? 'bg-gray-300 text-gray-500' : ''}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
              </div>
              <span className={`text-xs text-center max-w-[80px] transition-colors ${
                isCurrent ? 'font-semibold text-blue-700' : ''
              } ${
                isCompleted ? 'text-green-700 font-medium' : ''
              } ${
                isPending ? 'text-gray-400' : ''
              }`}>
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}