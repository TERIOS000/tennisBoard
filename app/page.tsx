"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState, useSyncExternalStore } from "react";

type Slot = {
  time: string;
  courts: string[];
  qrImages?: QrImage[];
  updatedAt?: string | null;
};

type QrImage = {
  url: string;
  name: string;
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
  const [qrImages, setQrImages] = useState<QrImage[]>([]);
  const [viewedImage, setViewedImage] = useState<QrImage | null>(null);
  const [imageError, setImageError] = useState("");

  function openEditor(day: Day, slot: Slot) {
    setSelectedSlot({ date: day.date, label: day.label, time: slot.time });
    setSelectedCourts([...slot.courts]);
    setQrImages(slot.qrImages ?? []);
    setImageError("");
  }

  function closeEditor() {
    setSelectedSlot(null);
    setSelectedCourts([]);
    setQrImages([]);
    setViewedImage(null);
    setImageError("");
  }

  function toggleCourt(court: string) {
    setSelectedCourts((currentCourts) =>
      currentCourts.includes(court)
        ? currentCourts.filter((item) => item !== court)
        : [...currentCourts, court]
    );
  }

  function updateSelectedSlot(courts: string[], images: QrImage[]) {
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
                      qrImages: images,
                      updatedAt,
                    }
              ),
            }
      )
    );
  }

  function saveSlot() {
    updateSelectedSlot(selectedCourts, qrImages);
    closeEditor();
  }

  function clearSlot() {
    if (!window.confirm("Clear all courts and QR images from this slot?")) {
      return;
    }

    updateSelectedSlot([], []);
    closeEditor();
  }

  function handleQrChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    const invalidType = files.find(
      (file) => !allowedImageTypes.includes(file.type)
    );
    const oversizedFile = files.find((file) => file.size > maxImageSize);

    if (invalidType) {
      setImageError(`${invalidType.name} is not a JPEG, PNG, or WebP image.`);
      event.target.value = "";
      return;
    }

    if (oversizedFile) {
      setImageError(`${oversizedFile.name} is larger than 5 MB.`);
      event.target.value = "";
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise<QrImage>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              typeof reader.result === "string"
                ? resolve({ url: reader.result, name: file.name })
                : reject(new Error("Invalid image result"));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    )
      .then((newImages) => {
        setQrImages((currentImages) => [...currentImages, ...newImages]);
        setImageError("");
      })
      .catch(() => setImageError("One or more images could not be read."));

    event.target.value = "";
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
                    {slot.qrImages && slot.qrImages.length > 0 && (
                      <span className="qr-badge">{slot.qrImages.length} QR</span>
                    )}
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
              <label htmlFor="qr-image">Booking QR images (optional)</label>
              <input
                id="qr-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleQrChange}
              />
              <small>JPEG, PNG, or WebP · maximum 5 MB</small>
              {imageError && <p className="field-error">{imageError}</p>}
            </div>

            {qrImages.length > 0 && (
              <div className="qr-gallery" aria-label="Selected QR images">
                {qrImages.map((image, index) => (
                  <div className="qr-preview" key={`${image.name}-${index}`}>
                    <button
                      className="qr-thumbnail"
                      type="button"
                      onClick={() => setViewedImage(image)}
                      aria-label={`View ${image.name} larger`}
                    >
                      <Image
                        src={image.url}
                        alt=""
                        width={180}
                        height={180}
                        unoptimized
                      />
                    </button>
                    <p title={image.name}>{image.name}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setQrImages((currentImages) =>
                          currentImages.filter(
                            (_, itemIndex) => itemIndex !== index
                          )
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
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

      {viewedImage && (
        <div className="image-viewer-backdrop">
          <section
            className="image-viewer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-viewer-title"
          >
            <header>
              <h2 id="image-viewer-title">{viewedImage.name}</h2>
              <button
                className="icon-button"
                type="button"
                onClick={() => setViewedImage(null)}
                aria-label="Close image viewer"
              >
                ×
              </button>
            </header>
            <Image
              src={viewedImage.url}
              alt={`Large preview of ${viewedImage.name}`}
              width={1200}
              height={1200}
              unoptimized
            />
            <a href={viewedImage.url} download={viewedImage.name}>
              Save image
            </a>
          </section>
        </div>
      )}
    </main>
  );
}
