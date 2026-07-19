"use client";

import Image from "next/image";
import {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type Language = "en" | "th";

type QrImage = {
  url: string;
  name: string;
};

type Slot = {
  time: string;
  courts: string[];
  qrImages?: QrImage[];
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

type Gallery = SelectedSlot & {
  images: QrImage[];
};

type Lightbox = {
  images: QrImage[];
  index: number;
};

type EditorSnapshot = {
  courts: string[];
  images: QrImage[];
};

const copy = {
  en: {
    appName: "Tennis Board",
    subtitle: "Courts reserved by our group",
    today: "Today",
    todayShortcut: "Go to today",
    language: "Language",
    edit: "Edit",
    editSlot: "Edit slot",
    courts: "Courts",
    qrImages: "Booking QR images (optional)",
    imageHelp: "JPEG, PNG, or WebP · maximum 5 MB each",
    selectedImages: "Selected QR images",
    viewImages: (count: number) => `${count} QR`,
    viewNamedImage: (name: string) => `View ${name} larger`,
    remove: "Remove",
    removeImage: (name: string) => `Remove ${name}?`,
    clearSlot: "Clear slot",
    clearConfirm: "Clear all courts and QR images from this slot?",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    closeEditor: "Close editor",
    closeGallery: "Close image gallery",
    closeViewer: "Close image viewer",
    discardConfirm: "Discard your unsaved changes?",
    saved: "Slot saved",
    cleared: "Slot cleared",
    updated: (time: string) => `Updated ${time}`,
    scheduleLabel: "Weekly tennis court schedule",
    editLabel: (label: string, time: string) => `Edit ${label} at ${time}`,
    galleryTitle: (label: string, time: string) => `${label} · ${time} QR images`,
    previousImage: "Previous image",
    nextImage: "Next image",
    imagePosition: (current: number, total: number) => `Image ${current} of ${total}`,
    largePreview: (name: string) => `Large preview of ${name}`,
    saveImage: "Save image",
    invalidType: (name: string) =>
      `${name} is not a JPEG, PNG, or WebP image.`,
    tooLarge: (name: string) => `${name} is larger than 5 MB.`,
    readError: "One or more images could not be read.",
  },
  th: {
    appName: "ตารางเทนนิส",
    subtitle: "คอร์ทที่กลุ่มของเราจองไว้",
    today: "วันนี้",
    todayShortcut: "ไปที่วันนี้",
    language: "ภาษา",
    edit: "แก้ไข",
    editSlot: "แก้ไขช่วงเวลา",
    courts: "คอร์ท",
    qrImages: "รูป QR การจอง (ไม่บังคับ)",
    imageHelp: "JPEG, PNG หรือ WebP · ไม่เกิน 5 MB ต่อรูป",
    selectedImages: "รูป QR ที่เลือก",
    viewImages: (count: number) => `${count} QR`,
    viewNamedImage: (name: string) => `ดู ${name} แบบขยาย`,
    remove: "ลบ",
    removeImage: (name: string) => `ลบ ${name} หรือไม่`,
    clearSlot: "ล้างช่วงเวลา",
    clearConfirm: "ล้างคอร์ทและรูป QR ทั้งหมดในช่วงเวลานี้หรือไม่",
    cancel: "ยกเลิก",
    save: "บันทึก",
    close: "ปิด",
    closeEditor: "ปิดหน้าต่างแก้ไข",
    closeGallery: "ปิดแกลเลอรีรูป",
    closeViewer: "ปิดรูปขยาย",
    discardConfirm: "ละทิ้งการเปลี่ยนแปลงที่ยังไม่ได้บันทึกหรือไม่",
    saved: "บันทึกช่วงเวลาแล้ว",
    cleared: "ล้างช่วงเวลาแล้ว",
    updated: (time: string) => `อัปเดต ${time}`,
    scheduleLabel: "ตารางคอร์ทเทนนิสประจำสัปดาห์",
    editLabel: (label: string, time: string) => `แก้ไข ${label} เวลา ${time}`,
    galleryTitle: (label: string, time: string) => `รูป QR ${label} · ${time}`,
    previousImage: "รูปก่อนหน้า",
    nextImage: "รูปถัดไป",
    imagePosition: (current: number, total: number) =>
      `รูปที่ ${current} จาก ${total}`,
    largePreview: (name: string) => `ภาพขยายของ ${name}`,
    saveImage: "บันทึกรูป",
    invalidType: (name: string) =>
      `${name} ไม่ใช่ไฟล์ JPEG, PNG หรือ WebP`,
    tooLarge: (name: string) => `${name} มีขนาดเกิน 5 MB`,
    readError: "ไม่สามารถอ่านรูปอย่างน้อยหนึ่งรูปได้",
  },
} as const;

const allowedCourts = ["C1", "C2", "C3", "C4", "C5"];
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const boardTimeZone = "Asia/Bangkok";
const dayInMilliseconds = 24 * 60 * 60 * 1000;
const subscribeToHydration = () => () => {};
const languageStorageKey = "tennis-board-language";
const languageChangeEvent = "tennis-board-language-change";
const focusableSelector =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sampleDays: Pick<Day, "slots">[] = [
  { slots: [{ time: "18:00", courts: ["C4"] }, { time: "19:00", courts: ["C3", "C4"] }, { time: "20:00", courts: [] }] },
  { slots: [{ time: "18:00", courts: ["C4"] }, { time: "19:00", courts: ["C4"] }, { time: "20:00", courts: [] }] },
  { slots: [{ time: "18:00", courts: ["C4"] }, { time: "19:00", courts: [] }, { time: "20:00", courts: ["C4"] }] },
  { slots: [{ time: "18:00", courts: ["C4"] }, { time: "19:00", courts: ["C2"] }, { time: "20:00", courts: [] }] },
  { slots: [{ time: "18:00", courts: [] }, { time: "19:00", courts: ["C4"] }, { time: "20:00", courts: [] }] },
  { slots: [{ time: "18:00", courts: [] }, { time: "19:00", courts: ["C4"] }, { time: "20:00", courts: [] }] },
  { slots: [{ time: "18:00", courts: [] }, { time: "19:00", courts: ["C4"] }, { time: "20:00", courts: [] }] },
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

function createBoardDays(language: Language, now = new Date()): Day[] {
  const today = getBangkokDate(now);
  const labelFormatter = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", {
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

function formatDateRange(days: Day[], language: Language) {
  if (days.length === 0) return "";
  const start = parseDateKey(days[0].date);
  const end = parseDateKey(days[days.length - 1].date);
  const formatter = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function snapshotsMatch(left: EditorSnapshot | null, courts: string[], images: QrImage[]) {
  if (!left) return true;
  return (
    JSON.stringify(left.courts) === JSON.stringify(courts) &&
    JSON.stringify(left.images) === JSON.stringify(images)
  );
}

function getLanguageSnapshot(): Language {
  return window.localStorage.getItem(languageStorageKey) === "th" ? "th" : "en";
}

function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(languageChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(languageChangeEvent, onChange);
  };
}

function useAccessibleDialog(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const focusables = Array.from(
      container?.querySelectorAll<HTMLElement>(focusableSelector) ?? []
    );
    (focusables[0] ?? container)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [active, containerRef]);
}

function Dialog({
  active,
  className,
  labelledBy,
  onClose,
  children,
}: {
  active: boolean;
  className: string;
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useAccessibleDialog(active, dialogRef, onClose);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={className}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  );
}

export default function Home() {
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const language = useSyncExternalStore<Language>(
    subscribeToLanguage,
    getLanguageSnapshot,
    (): Language => "en"
  );
  const t = copy[language];
  const generatedDays = useMemo(
    () => (isHydrated ? createBoardDays(language) : []),
    [isHydrated, language]
  );
  const [editedBoardDays, setEditedBoardDays] = useState<Day[] | null>(null);
  const boardDays = editedBoardDays ?? generatedDays;
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [qrImages, setQrImages] = useState<QrImage[]>([]);
  const [editorSnapshot, setEditorSnapshot] = useState<EditorSnapshot | null>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  const [imageError, setImageError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const todayRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function changeLanguage(nextLanguage: Language) {
    window.localStorage.setItem(languageStorageKey, nextLanguage);
    window.dispatchEvent(new Event(languageChangeEvent));
    setEditedBoardDays((days) =>
      days
        ? days.map((day, index) => ({
            ...day,
            label: createBoardDays(nextLanguage)[index].label,
          }))
        : null
    );
  }

  function openEditor(day: Day, slot: Slot) {
    const images = slot.qrImages ?? [];
    const courts = [...slot.courts];
    setSelectedSlot({ date: day.date, label: day.label, time: slot.time });
    setSelectedCourts(courts);
    setQrImages(images);
    setEditorSnapshot({ courts, images });
    setImageError("");
  }

  const closeEditor = useCallback(() => {
    const hasChanges = !snapshotsMatch(editorSnapshot, selectedCourts, qrImages);
    if (hasChanges && !window.confirm(copy[language].discardConfirm)) return;
    setSelectedSlot(null);
    setSelectedCourts([]);
    setQrImages([]);
    setEditorSnapshot(null);
    setImageError("");
  }, [editorSnapshot, language, qrImages, selectedCourts]);

  function finishEditor() {
    setSelectedSlot(null);
    setSelectedCourts([]);
    setQrImages([]);
    setEditorSnapshot(null);
    setImageError("");
  }

  function toggleCourt(court: string) {
    setSelectedCourts((current) =>
      current.includes(court)
        ? current.filter((item) => item !== court)
        : [...current, court]
    );
  }

  function updateSelectedSlot(courts: string[], images: QrImage[]) {
    if (!selectedSlot) return;
    const updatedAt = new Date().toLocaleTimeString(language === "th" ? "th-TH" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: boardTimeZone,
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
                  : { ...slot, courts: [...courts].sort(), qrImages: images, updatedAt }
              ),
            }
      )
    );
  }

  function saveSlot() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    updateSelectedSlot(selectedCourts, qrImages);
    setNotice(t.saved);
    finishEditor();
    setIsSubmitting(false);
  }

  function clearSlot() {
    if (isSubmitting || !window.confirm(t.clearConfirm)) return;
    setIsSubmitting(true);
    updateSelectedSlot([], []);
    setNotice(t.cleared);
    finishEditor();
    setIsSubmitting(false);
  }

  function removeImage(index: number) {
    const image = qrImages[index];
    if (!image || !window.confirm(t.removeImage(image.name))) return;
    setQrImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleQrChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const invalidType = files.find((file) => !allowedImageTypes.includes(file.type));
    const oversizedFile = files.find((file) => file.size > maxImageSize);
    if (invalidType) {
      setImageError(t.invalidType(invalidType.name));
      event.target.value = "";
      return;
    }
    if (oversizedFile) {
      setImageError(t.tooLarge(oversizedFile.name));
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
        setQrImages((current) => [...current, ...newImages]);
        setImageError("");
      })
      .catch(() => setImageError(t.readError));
    event.target.value = "";
  }

  const closeGallery = useCallback(() => setGallery(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  function moveLightbox(direction: -1 | 1) {
    setLightbox((current) =>
      current
        ? {
            ...current,
            index: (current.index + direction + current.images.length) % current.images.length,
          }
        : null
    );
  }

  function handleViewerKeys(event: ReactKeyboardEvent) {
    if (event.key === "ArrowLeft") moveLightbox(-1);
    if (event.key === "ArrowRight") moveLightbox(1);
  }

  const currentImage = lightbox?.images[lightbox.index];

  return (
    <main className="board">
      <header className="board-header">
        <div>
          <p className="date-range">{formatDateRange(boardDays, language)}</p>
          <h1>{t.appName}</h1>
          <p>{t.subtitle}</p>
        </div>
      </header>

      <nav className="board-toolbar" aria-label={t.todayShortcut}>
        <span>{formatDateRange(boardDays, language)}</span>
        <div className="toolbar-actions">
          <fieldset className="language-switcher" aria-label={t.language}>
          <button
            type="button"
            className={language === "en" ? "active" : ""}
            aria-pressed={language === "en"}
            onClick={() => changeLanguage("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={language === "th" ? "active" : ""}
            aria-pressed={language === "th"}
            onClick={() => changeLanguage("th")}
          >
            ไทย
          </button>
          </fieldset>
          <button type="button" onClick={() => todayRef.current?.scrollIntoView({ behavior: "smooth" })}>
            {t.todayShortcut}
          </button>
        </div>
      </nav>

      <section className="day-list" aria-label={t.scheduleLabel}>
        {boardDays.map((day) => (
          <article
            className={`day-card ${day.isToday ? "today" : ""}`}
            key={day.date}
            ref={day.isToday ? todayRef : undefined}
          >
            <h2>
              {day.isToday && <span className="today-label">{t.today} · </span>}
              {day.label}
            </h2>
            <div className="slot-list">
              {day.slots.map((slot) => {
                const images = slot.qrImages ?? [];
                return (
                  <div className="slot-row" key={slot.time}>
                    <time>{slot.time}</time>
                    <span className="court-name">
                      {slot.courts.length > 0 ? slot.courts.join(", ") : "—"}
                    </span>
                    <span className="slot-meta">
                      {images.length > 0 && (
                        <button
                          className="qr-badge"
                          type="button"
                          onClick={() =>
                            setGallery({ date: day.date, label: day.label, time: slot.time, images })
                          }
                        >
                          {t.viewImages(images.length)}
                        </button>
                      )}
                      {slot.updatedAt && <small>{t.updated(slot.updatedAt)}</small>}
                    </span>
                    <button
                      className="edit-button"
                      type="button"
                      onClick={() => openEditor(day, slot)}
                      aria-label={t.editLabel(day.label, slot.time)}
                    >
                      {t.edit}
                    </button>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      {selectedSlot && (
        <Dialog
          active={!lightbox}
          className="slot-editor"
          labelledBy="editor-title"
          onClose={closeEditor}
        >
          <header className="editor-header">
            <div>
              <p>{t.editSlot}</p>
              <h2 id="editor-title">{selectedSlot.label} · {selectedSlot.time}</h2>
            </div>
            <button className="icon-button" type="button" onClick={closeEditor} aria-label={t.closeEditor}>×</button>
          </header>
          <fieldset>
            <legend>{t.courts}</legend>
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
            <label htmlFor="qr-image">{t.qrImages}</label>
            <input id="qr-image" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleQrChange} />
            <small>{t.imageHelp}</small>
            {imageError && <p className="field-error" role="alert">{imageError}</p>}
          </div>
          {qrImages.length > 0 && (
            <div className="qr-gallery" aria-label={t.selectedImages}>
              {qrImages.map((image, index) => (
                <div className="qr-preview" key={`${image.name}-${index}`}>
                  <button
                    className="qr-thumbnail"
                    type="button"
                    onClick={() => setLightbox({ images: qrImages, index })}
                    aria-label={t.viewNamedImage(image.name)}
                  >
                    <Image src={image.url} alt="" width={180} height={180} unoptimized />
                  </button>
                  <p title={image.name}>{image.name}</p>
                  <button type="button" onClick={() => removeImage(index)}>{t.remove}</button>
                </div>
              ))}
            </div>
          )}
          <div className="editor-actions">
            <button className="danger-button" type="button" onClick={clearSlot} disabled={isSubmitting}>{t.clearSlot}</button>
            <div>
              <button type="button" onClick={closeEditor}>{t.cancel}</button>
              <button className="save-button" type="button" onClick={saveSlot} disabled={isSubmitting}>{t.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {gallery && (
        <Dialog
          active={!lightbox}
          className="gallery-dialog"
          labelledBy="gallery-title"
          onClose={closeGallery}
        >
          <header className="editor-header">
            <h2 id="gallery-title">{t.galleryTitle(gallery.label, gallery.time)}</h2>
            <button className="icon-button" type="button" onClick={closeGallery} aria-label={t.closeGallery}>×</button>
          </header>
          <div className="qr-gallery read-only-gallery">
            {gallery.images.map((image, index) => (
              <button
                className="gallery-card"
                type="button"
                key={`${image.name}-${index}`}
                onClick={() => setLightbox({ images: gallery.images, index })}
                aria-label={t.viewNamedImage(image.name)}
              >
                <Image src={image.url} alt="" width={240} height={240} unoptimized />
                <span>{image.name}</span>
              </button>
            ))}
          </div>
        </Dialog>
      )}

      {lightbox && currentImage && (
        <Dialog active className="image-viewer" labelledBy="image-viewer-title" onClose={closeLightbox}>
          <div onKeyDown={handleViewerKeys}>
            <header>
              <div>
                <h2 id="image-viewer-title">{currentImage.name}</h2>
                <p>{t.imagePosition(lightbox.index + 1, lightbox.images.length)}</p>
              </div>
              <button className="icon-button" type="button" onClick={closeLightbox} aria-label={t.closeViewer}>×</button>
            </header>
            <Image
              src={currentImage.url}
              alt={t.largePreview(currentImage.name)}
              width={1200}
              height={1200}
              unoptimized
            />
            <div className="viewer-actions">
              <button type="button" onClick={() => moveLightbox(-1)} disabled={lightbox.images.length < 2}>{t.previousImage}</button>
              <a href={currentImage.url} download={currentImage.name}>{t.saveImage}</a>
              <button type="button" onClick={() => moveLightbox(1)} disabled={lightbox.images.length < 2}>{t.nextImage}</button>
            </div>
          </div>
        </Dialog>
      )}

      <div className="toast" role="status" aria-live="polite">{notice}</div>
    </main>
  );
}
