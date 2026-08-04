'use client'

import { PERSON_FIELDS } from '@/lib/person-fields'
import type { PersonDetail } from '@/lib/types'

import { PersonFieldForm } from './person-field-form'
import { PersonPrimaryForm } from './person-primary-form'
import { PersonRemoveForm } from './person-remove-form'
import { PersonRolesForm } from './person-roles-form'

/**
 * Una persona. Nessun titolo con nome e cognome sopra i campi: sarebbero due rappresentazioni
 * dello stesso valore a dieci pixel di distanza, e il nome è già il primo campo. Il nome torna
 * dove serve davvero, cioè nell'etichetta accessibile del pulsante che elimina.
 */
export function PersonBlock({ person, onRemoved }: { person: PersonDetail; onRemoved: () => void }) {
  return (
    <li className="person">
      <div className="detail-grid">
        {PERSON_FIELDS.map((field) => (
          <PersonFieldForm key={field.key} personId={person.id} field={field} value={person[field.key]} />
        ))}
      </div>

      <PersonRolesForm personId={person.id} roles={person.decision_roles} />

      <div className="person__foot">
        <PersonPrimaryForm personId={person.id} isPrimary={person.is_primary} />
        <PersonRemoveForm person={person} onRemoved={onRemoved} />
      </div>
    </li>
  )
}
