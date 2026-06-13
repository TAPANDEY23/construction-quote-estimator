import ProgressBar        from './ProgressBar';
import Step1Location       from './steps/Step1Location';
import Step2SiteConditions from './steps/Step2SiteConditions';
import Step2Build          from './steps/Step2Build';
import StepRoofType        from './steps/StepRoofType';
import StepFacade          from './steps/StepFacade';
import Step6FinishLevel    from './steps/Step6FinishLevel';
import StepCeilingHeight   from './steps/StepCeilingHeight';
import StepGlazing         from './steps/StepGlazing';
import StepBedrooms        from './steps/StepBedrooms';
import StepBathrooms       from './steps/StepBathrooms';
import StepLivingAreas     from './steps/StepLivingAreas';
import StepKitchen         from './steps/StepKitchen';
import StepLaundry         from './steps/StepLaundry';
import Step4Garage         from './steps/Step4Garage';
import StepOutdoorLiving   from './steps/StepOutdoorLiving';
import StepAddOns          from './steps/StepAddOns';
import { calcLiveEstimate, fmtAUD } from '../utils/liveEstimate';

const TOTAL_STEPS = 16;

export default function WizardContainer({ formData, setFormData, onSubmit, currentStep, setCurrentStep }) {
  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const next = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setCurrentStep(s => Math.max(s - 1, 1));

  const stepProps = { formData, update, onNext: next, onBack: back, onSubmit };

  const est = currentStep >= 2 ? calcLiveEstimate(formData) : null;

  return (
    <>
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {est && (
        <div className="live-estimate-bar">
          <span className="live-est-label">Live estimate</span>
          <div className="live-est-values">
            <span className="live-est-low">{fmtAUD(est.low)}</span>
            <span className="live-est-dash">–</span>
            <span className="live-est-high">{fmtAUD(est.high)}</span>
          </div>
          <div className="live-est-mid-wrap">
            <span className="live-est-mid">{fmtAUD(est.mid)}</span>
            <span className="live-est-mid-label">mid</span>
          </div>
        </div>
      )}

      {currentStep === 1  && <Step1Location       {...stepProps} />}
      {currentStep === 2  && <Step2Build           {...stepProps} />}
      {currentStep === 3  && <Step2SiteConditions  {...stepProps} />}
      {currentStep === 4  && <StepRoofType         {...stepProps} />}
      {currentStep === 5  && <StepFacade            {...stepProps} />}
      {currentStep === 6  && <Step6FinishLevel      {...stepProps} />}
      {currentStep === 7  && <StepCeilingHeight     {...stepProps} />}
      {currentStep === 8  && <StepGlazing           {...stepProps} />}
      {currentStep === 9  && <StepBedrooms          {...stepProps} />}
      {currentStep === 10 && <StepBathrooms         {...stepProps} />}
      {currentStep === 11 && <StepLivingAreas       {...stepProps} />}
      {currentStep === 12 && <StepKitchen           {...stepProps} />}
      {currentStep === 13 && <StepLaundry           {...stepProps} />}
      {currentStep === 14 && <Step4Garage           {...stepProps} />}
      {currentStep === 15 && <StepOutdoorLiving     {...stepProps} />}
      {currentStep === 16 && <StepAddOns            {...stepProps} />}
    </>
  );
}
