import type { Dispatch, SetStateAction } from 'react';

export type ListingDraft = Record<string, any>;
export type ListingField = (name: string, value: any) => void;

export type WizardStepProps = {
  item: ListingDraft;
  field: ListingField;
  setItem: Dispatch<SetStateAction<ListingDraft>>;
};
