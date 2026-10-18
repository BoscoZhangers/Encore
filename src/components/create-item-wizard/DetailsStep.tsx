import type { WizardStepProps } from './types';
import { EditableNumberInput } from './EditableNumberInput';
import { PricingStep } from './PricingStep';

const categories = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Sports', 'Other'];
const conditions = ['New', 'Like new', 'Good', 'Fair', 'For parts'];

export function DetailsStep({
  item,
  field,
  photoQuestions,
  dismissPhotoQuestions,
}: Pick<WizardStepProps, 'item' | 'field'> & {
  photoQuestions: string[];
  dismissPhotoQuestions: () => void;
}) {
  return (
    <>
      <label>
        Item title
        <input
          value={item.title}
          onChange={(event) => field('title', event.target.value)}
          minLength={3}
          maxLength={100}
          placeholder="e.g. Sony WH-1000XM4 headphones"
          required
        />
      </label>
      <div className="two-fields">
        <label>
          Category
          <select
            required
            value={item.category}
            onChange={(event) => field('category', event.target.value)}
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Condition
          <select
            required
            value={item.condition}
            onChange={(event) => field('condition', event.target.value)}
          >
            <option value="" disabled>
              Select a condition
            </option>
            {conditions.map((condition) => (
              <option key={condition}>{condition}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Description
        <textarea
          value={item.description}
          onChange={(event) => field('description', event.target.value)}
          minLength={10}
          maxLength={2000}
          placeholder="What makes it useful? Any wear, missing parts, or things you haven’t tested?"
          required
        />
      </label>
      {photoQuestions.length > 0 && (
        <div className="draft-followup">
          <strong>A few things to check before listing</strong>
          <ul>
            {photoQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
          <p>
            Update your description, then add only answers you can confirm to your agent’s knowledge
            below.
          </p>
          <button type="button" className="text-button" onClick={dismissPhotoQuestions}>
            Dismiss checklist
          </button>
        </div>
      )}
      <label>
        Total quantity
        <EditableNumberInput
          min={Math.max(1, (item.reserved || 0) + (item.sold || 0))}
          max="1000"
          step="1"
          value={item.quantity}
          onValueChange={(value) => field('quantity', Math.round(value))}
          required
        />
      </label>
      <PricingStep item={item} field={field} />
    </>
  );
}
