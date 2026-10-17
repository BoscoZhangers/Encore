import { AgentKnowledgeStep } from './AgentKnowledgeStep';
import { DetailsStep } from './DetailsStep';
import { HandoffStep } from './HandoffStep';
import { PaymentStep } from './PaymentStep';
import type { WizardStepProps } from './types';
import type { Tell } from '../feedback/Toast';

export function CreateItemStep({
  step,
  item,
  field,
  setItem,
  photoQuestions,
  setPhotoQuestions,
  tell,
}: WizardStepProps & {
  step: number;
  photoQuestions: string[];
  setPhotoQuestions: (questions: string[]) => void;
  tell: Tell;
}) {
  if (step === 1)
    return (
      <DetailsStep
        item={item}
        field={field}
        photoQuestions={photoQuestions}
        dismissPhotoQuestions={() => setPhotoQuestions([])}
      />
    );
  if (step === 2) return <AgentKnowledgeStep item={item} field={field} />;
  if (step === 3) return <HandoffStep item={item} field={field} setItem={setItem} tell={tell} />;
  if (step === 4) return <PaymentStep item={item} field={field} />;
  return null;
}
