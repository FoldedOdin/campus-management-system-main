import React from 'react';
import StudentEventsPage from './StudentEventsPage';

export default function StudentArtsPage() {
  return (
    <StudentEventsPage
      forcedCategory={['Cultural', 'Workshops/Seminar', 'Fest/College Day', 'Technical']}
      titleOverride="Arts & Cultural Events"
    />
  );
}
