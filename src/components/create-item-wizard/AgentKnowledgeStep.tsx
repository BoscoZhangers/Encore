import { Plus } from 'lucide-react';
import type { WizardStepProps } from './types';

export function AgentKnowledgeStep({ item, field }: Pick<WizardStepProps, 'item' | 'field'>) {
  return (
    <>
      <p className="muted">
        These answers are not displayed on your public listing. Cora may share them in a buyer
        conversation when asked. Add only information you are comfortable sharing with buyers.
      </p>
      {item.facts.map((fact: any, index: number) => (
        <div className="fact-editor" key={fact.id}>
          <label>
            Question
            <input
              value={fact.question}
              maxLength={200}
              minLength={3}
              required
              onChange={(event) =>
                field(
                  'facts',
                  item.facts.map((candidate: any, candidateIndex: number) =>
                    candidateIndex === index
                      ? { ...candidate, question: event.target.value }
                      : candidate,
                  ),
                )
              }
              placeholder="Is the original case included?"
            />
          </label>
          <label>
            Confirmed answer
            <textarea
              value={fact.answer}
              maxLength={800}
              required
              onChange={(event) =>
                field(
                  'facts',
                  item.facts.map((candidate: any, candidateIndex: number) =>
                    candidateIndex === index
                      ? { ...candidate, answer: event.target.value }
                      : candidate,
                  ),
                )
              }
              placeholder="Yes, the original case is included."
            />
          </label>
          <button
            type="button"
            className="text-button danger"
            onClick={() =>
              field(
                'facts',
                item.facts.filter((_: any, candidateIndex: number) => candidateIndex !== index),
              )
            }
          >
            Remove fact
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={item.facts.length >= 40}
        className="button secondary"
        onClick={() =>
          field('facts', [...item.facts, { id: crypto.randomUUID(), question: '', answer: '' }])
        }
      >
        <Plus size={15} /> Add a confirmed fact
      </button>
    </>
  );
}
