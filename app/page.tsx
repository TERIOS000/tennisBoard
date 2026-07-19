"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState, useSyncExternalStore } from "react";

type Slot = {
  time: string;
  courts: string[];
  qrImageUrl?: string | null;
  updatedAt?: string | null;
};

type Day = {
  date: string;
  label: string;
  isToday: boolean;
  slots: Slot[];
};

type SelectedSlot = {
  date: string;
  label: string;
  time: string;
};

const allowedCourts = ["C1", "C2", "C3", "C4", "C5"];
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const boardTimeZone = "Asia/Bangkok";
const dayInMilliseconds = 24 * 60 * 60 * 1000;
const subscribeToHydration = () => () => {};

const sampleDays: Pick<Day, "slots">[] = [
  {
    slots: [
      { time: "18:00", courts: ["C4"] },
      { time: "19:00", courts: ["C3", "C4"] },
      { time: "20:00", courts: [] },
    ],
  },
  {
    slots: [
      { time: "18:00", courts: ["C4"] },
      { time: "19:00", courts: ["C4"] },
      { time: "20:00", courts: [] },
    ],
  },
  {
    slots: [
      { time: "18:00", courts: ["C4"] },
      { time: "19:00", courts: [] },
      { time: "20:00", courts: ["C4"] },
    ],
  },
  {
    slots: [
      { time: "18:00", courts: ["C4"] },
      { time: "19:00", courts: ["C2"] },
      { time: "20:00", courts: [] },
    ],
  },
  {
    slots: [
      { time: "18:00", courts: [] },
      { time: "19:00", courts: ["C4"] },
      { time: "20:00", courts: [] },
    ],
  },
  {
    slots: [
      { time: "18:00", courts: [] },
      { time: "19:00", courts: ["C4"] },
      { time: "20:00", courts: [] },
    ],
  },
  {
    slots: [
      { time: "18:00", courts: [] },
      { time: "19:00", courts: ["C4"] },
      { time: "20:00", courts: [] },
    ],
  },
];

function getBangkokDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: boardTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12)
  );
}

function formatDateKey(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function createBoardDays(now = new Date()): Day[] {
  const today = getBangkokDate(now);
  const labelFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return sampleDays.map(({ slots }, index) => {
    const date = new Date(today.getTime() + index * dayInMilliseconds);

    return {
      date: formatDateKey(date),
      label: labelFormatter.format(date),
      isToday: index === 0,
      slots: slots.map((slot) => ({ ...slot, courts: [...slot.courts] })),
    };
  });
}

function parseDateKey(dateKey: string) {
  const [day, month, year] = dateKey.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatDateRange(days: Day[]) {
  if (days.length === 0) return "";

  const start = parseDateKey(days[0].date);
  const end = parseDateKey(days[days.length - 1].date);
  const monthFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
  });
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonth = monthFormatter.format(start);
  const endMonth = monthFormatter.format(end);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear !== endYear) {
    return `${startDay} ${startMonth} ${startYear}\u2013${endDay} ${endMonth} ${endYear}`;
  }

  if (startMonth !== endMonth) {
    return `${startDay} ${startMonth}\u2013${endDay} ${endMonth} ${endYear}`;
  }

  return `${startDay}\u2013${endDay} ${endMonth} ${endYear}`;
}

export default function Home() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const generatedDays = useMemo(
    () => (isHydrated ? createBoardDays() : []),
    [isHydrated]
  );
  const [editedBoardDays, setEditedBoardDays] = useState<Day[] | null>(null);
  const boardDays = editedBoardDays ?? generatedDays;
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");

  function openEditor(day: Day, slot: Slot) {
    setSelectedSlot({ date: day.date, label: day.label, time: slot.time });
    setSelectedCourts([...slot.courts]);
    setQrImageUrl(slot.qrImageUrl ?? null);
    setImageError("");
  }

  function closeEditor() {
    setSelectedSlot(null);
    setSelectedCourts([]);
    setQrImageUrl(null);
    setImageError("");
  }

  function toggleCourt(court: string) {
    setSelectedCourts((currentCourts) =>
      currentCourts.includes(court)
        ? currentCourts.filter((item) => item !== court)
        : [...currentCourts, court]
    );
  }

  function updateSelectedSlot(courts: string[], imageUrl: string | null) {
    if (!selectedSlot) return;

    const updatedAt = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });

    setEditedBoardDays((currentDays) =>
      (currentDays ?? boardDays).map((day) =>
        day.date !== selectedSlot.date
          ? day
          : {
              ...day,
              slots: day.slots.map((slot) =>
                slot.time !== selectedSlot.time
                  ? slot
                  : {
                      ...slot,
                      courts: [...courts].sort(),
                      qrImageUrl: imageUrl,
                      updatedAt,
                    }
              ),
            }
      )
    );
  }

  function saveSlot() {
    updateSelectedSlot(selectedCourts, qrImageUrl);
    closeEditor();
  }

  function clearSlot() {
    if (!window.confirm("Clear all courts and the QR image from this slot?")) {
      return;
    }

    updateSelectedSlot([], null);
    closeEditor();
  }

  function handleQrChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!allowedImageTypes.includes(file.type)) {
      setImageError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > maxImageSize) {
      setImageError("The image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setQrImageUrl(typeof reader.result === "string" ? reader.result : null);
      setImageError("");
    };
    reader.onerror = () => setImageError("The image could not be read.");
    reader.readAsDataURL(file);
  }

  return (
    <main className="board">
      <header className="board-header">
        <p className="date-range">{formatDateRange(boardDays)}</p>
        <h1>Tennis Board</h1>
        <p>Courts reserved by our group</p>
      </header>

      <section className="day-list" aria-label="Weekly tennis court schedule">
        {boardDays.map((day) => (
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
                  onClick={() => openEditor(day, slot)}
                  aria-label={`Edit ${day.label} at ${slot.time}`}
                >
                  <time>{slot.time}</time>
                  <span className="court-name">
                    {slot.courts.length > 0 ? slot.courts.join(" , ") : "—"}
                  </span>
                  <span className="slot-meta">
                    {slot.qrImageUrl && <span className="qr-badge">QR</span>}
                    {slot.updatedAt && <small>Updated {slot.updatedAt}</small>}
                  </span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      {selectedSlot && (
        <div className="dialog-backdrop">
          <section
            className="slot-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <header className="editor-header">
              <div>
                <p>Edit slot</p>
                <h2 id="editor-title">
                  {selectedSlot.label} · {selectedSlot.time}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeEditor}
                aria-label="Close editor"
              >
                ×
              </button>
            </header>

            <fieldset>
              <legend>Courts</legend>
              <div className="court-options">
                {allowedCourts.map((court) => {
                  const isSelected = selectedCourts.includes(court);

                  return (
                    <button
                      className={`court-option ${isSelected ? "selected" : ""}`}
                      type="button"
                      key={court}
                      onClick={() => toggleCourt(court)}
                      aria-pressed={isSelected}
                    >
                      {court}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="qr-field">
              <label htmlFor="qr-image">Booking QR image (optional)</label>
              <input
                id="qr-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleQrChange}
              />
              <small>JPEG, PNG, or WebP · maximum 5 MB</small>
              {imageError && <p className="field-error">{imageError}</p>}
            </div>

            {qrImageUrl && (
              <div className="qr-preview">
                <Image
                  src={qrImageUrl}
                  alt="Selected booking QR preview"
                  width={280}
                  height={280}
                  unoptimized
                />
                <button type="button" onClick={() => setQrImageUrl(null)}>
                  Remove image
                </button>
              </div>
            )}

            <div className="editor-actions">
              <button className="danger-button" type="button" onClick={clearSlot}>
                Clear slot
              </button>
              <div>
                <button type="button" onClick={closeEditor}>
                  Cancel
                </button>
                <button className="save-button" type="button" onClick={saveSlot}>
                  Save
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
