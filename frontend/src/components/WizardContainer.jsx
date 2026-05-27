import ProgressBar from './ProgressBar';
import Step1Location from './steps/Step1Location';
import Step2Build from './steps/Step2Build';
import Step3Rooms from './steps/Step3Rooms';
import Step4Garage from './steps/Step4Garage';
import Step5BuildType from './steps/Step5BuildType';
import Step6Inclusions from './steps/Step6Inclusions';
import Step7Special from './steps/Step7Special';

const TOTAL_STEPS = 7;

export default function WizardContainer({ formData, setFormData, onSubmit, currentStep, setCurrentStep }) {
  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const next = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setCurrentStep(s => Math.max(s - 1, 1));

  const stepProps = { formData, update, onNext: next, onBack: back, onSubmit };

  return (
    <>
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      {currentStep === 1 && <Step1Location {...stepProps} />}
      {currentStep === 2 && <Step2Build {...stepProps} />}
      {currentStep === 3 && <Step3Rooms {...stepProps} />}
      {currentStep === 4 && <Step4Garage {...stepProps} />}
      {currentStep === 5 && <Step5BuildType {...stepProps} />}
      {currentStep === 6 && <Step6Inclusions {...stepProps} />}
      {currentStep === 7 && <Step7Special {...stepProps} />}
    </>
  );
}
