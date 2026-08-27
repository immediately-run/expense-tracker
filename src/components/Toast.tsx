interface Props {
  text: string;
  onClose: () => void;
}

function Toast({ text, onClose }: Props) {
  return (
    <div className="toast" role="status">
      <span>{text}</span>
      <button type="button" aria-label="Dismiss" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

export default Toast;
