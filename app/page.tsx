"use client";

import { useState } from "react";

type SelectedSlot = {
  date: string;
  time: string;
};

const days = [
  {
    date: "19/07/2026",
    label: "Sunday 19 Jul",
    isToday: true,
    slots: [
      { time: "18:00", courts: ["Court 4"] },
      { time: "19:00", courts: ["Court 3", "Court 4"] },
      { time: "20:00", courts: [] },
    ],
  },

  {
    date: "20/07/2026",
    label: "Monday 20 Jul",
    isToday: false,
    slots: [
      { time: "18:00", courts: ["Court 4"] },
      { time: "19:00", courts: ["Court 4"] },
      { time: "20:00", courts: [] },
    ],
  },

  {
    date: "21/07/2026",
    label: "Tuesday 21 Jul",
    isToday: false,
    slots: [
      { time: "18:00", courts: ["Court 4"] },
      { time: "19:00", courts: [] },
      { time: "20:00", courts: ["Court 4"] },
    ],
  },

  {
    date: "22/07/2026",
    label: "Wednesday 22 Jul",
    isToday: false,
    slots: [
      { time: "18:00", courts: ["Court 4"] },
      { time: "19:00", courts: ["Court 2"] },
      { time: "20:00", courts: [] },
    ],
  },

  {
    date: "23/07/2026",
    label: "Thursday 23 Jul",
    isToday: false,
    slots: [
      { time: "18:00", courts: [] },
      { time: "19:00", courts: ["Court 4"] },
      { time: "20:00", courts: [] },
    ],
  },

  {
    date: "24/07/2026",
    label: "Friday 24 Jul",
    isToday: false,
    slots: [
      { time: "18:00", courts: [] },
      { time: "19:00", courts: ["Court 4"] },
      { time: "20:00", courts: [] },
    ],
  },

  {
    date: "25/07/2026",
    label: "Saturday 25 Jul",
    isToday: false,
    slots: [
      { time: "18:00", courts: [] },
      { time: "19:00", courts: ["Court 4"] },
      { time: "20:00", courts: [] },
    ],
  },
]


export default function Home() {
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  return (
    <main className="board">
      <header className="board-header">
        <p className="date-range">19-25 July 2026</p>
        <h1>Tennis Board</h1>
        <p>Courts reserved by our group</p>
      </header>

      <section
        className="day-list"
        aria-label="Weekly tennis court schedule"
      >
        {days.map((day) => (
          <article
            className={`day-card ${day.isToday ? "today" : ""}`}
            key={day.date}
          >
            <h2>
              {day.isToday && <span className="today-label">Today · </span>}
              {day.label}
            </h2>

            <div className="slot-list">
              {day.slots.map((slot) => (
                <button
                  className="slot-row"
                  key={slot.time}
                  type="button"
                  onClick={() =>
                    setSelectedSlot({ date: day.date, time: slot.time })
                  }
                >
                  <time>{slot.time}</time>
                  
                  <span className="court-name">
                    {slot.courts.length > 0
                      ? slot.courts.join(" , ")
                      : "-"}
                  </span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      {selectedSlot && (
        <section className="slot-editor" aria-label="Edit selected slot">
          <div>
            <p className="editor-label">Selected slot</p>
            <h2>
              {selectedSlot.date} at {selectedSlot.time}
            </h2>
          </div>

          <button type="button" onClick={() => setSelectedSlot(null)}>
            Cancel
          </button>
        </section>
      )}
    </main>
  );
}
