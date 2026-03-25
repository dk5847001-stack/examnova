export function FormSwitchRow({ label, description, checked, onChange, name }) {
  return (
    <label className="switch-row">
      <div className="switch-row-copy">
        <strong>{label}</strong>
        <p className="support-copy">{description}</p>
      </div>
      <div className="form-check form-switch m-0">
        <input checked={checked} className="form-check-input switch-input" name={name} onChange={onChange} type="checkbox" />
      </div>
    </label>
  );
}
