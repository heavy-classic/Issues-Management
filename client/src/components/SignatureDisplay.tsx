interface Signature {
  id: string;
  signer_full_name: string;
  signature_meaning: string;
  signature_timestamp: string;
  signature_reason: string | null;
}

interface Props {
  signature: Signature;
  onVerify?: (id: string) => void;
}

export default function SignatureDisplay({ signature, onVerify }: Props) {
  return (
    <div className="sig-display">
      <div className="sig-display-icon">S</div>
      <div className="sig-display-info">
        <strong>{signature.signer_full_name}</strong>
        <span className="sig-display-meaning">{signature.signature_meaning}</span>
        <span className="sig-display-date">
          {new Date(signature.signature_timestamp).toLocaleString()}
        </span>
        {signature.signature_reason && (
          <span className="sig-display-reason">{signature.signature_reason}</span>
        )}
      </div>
      {onVerify && (
        <button
          onClick={() => onVerify(signature.id)}
          className="btn btn-secondary btn-sm"
        >
          Verify
        </button>
      )}
    </div>
  );
}
