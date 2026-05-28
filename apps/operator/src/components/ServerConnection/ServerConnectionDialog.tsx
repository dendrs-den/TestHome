import React from "react";
import {
  OPERATOR_SERVER_IP_KEY,
  OPERATOR_SERVER_PASSWORD_KEY,
  getOperatorServerIp,
  getOperatorServerPassword,
} from "../../Api_requests/coreBaseUrl";
import {
  buildCoreBaseUrl,
  checkCoreHealth,
  DEFAULT_CORE_PORT,
  isIPv4,
} from "../../../../../packages/lan-client/src/runtime";

type Props = {
  open?: boolean;
  onClose?: () => void;
};

export default function ServerConnectionDialog({ open = false, onClose }: Props) {
  const [requiredOpen, setRequiredOpen] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [inputIp, setInputIp] = React.useState(getOperatorServerIp());
  const [inputPassword, setInputPassword] = React.useState(getOperatorServerPassword());
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setInputIp(getOperatorServerIp());
    setInputPassword(getOperatorServerPassword());
  }, [open]);

  React.useEffect(() => {
    let active = true;
    const ip = getOperatorServerIp();
    const password = getOperatorServerPassword();
    setInputIp(ip);
    setInputPassword(password);
    setChecking(true);
    checkCoreHealth(buildCoreBaseUrl(ip, DEFAULT_CORE_PORT), password)
      .then((ok) => {
        if (!active) return;
        setRequiredOpen(!ok);
        setError(ok ? "" : "Raspberry недоступен или отклоняет пароль. Проверь IP и доступ к core.");
      })
      .finally(() => {
        if (active) {
          setChecking(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    const candidate = inputIp.trim();
    const password = inputPassword.trim();
    if (!isIPv4(candidate)) {
      setError("Введите корректный IP Raspberry в формате 192.168.0.177");
      return;
    }
    setChecking(true);
    setError("");
    const ok = await checkCoreHealth(buildCoreBaseUrl(candidate, DEFAULT_CORE_PORT), password);
    setChecking(false);
    if (!ok) {
      setError("По этому адресу core недоступен или отклоняет пароль.");
      return;
    }
    window.localStorage.setItem(OPERATOR_SERVER_IP_KEY, candidate);
    window.localStorage.setItem(OPERATOR_SERVER_PASSWORD_KEY, password);
    window.location.reload();
  }

  const visible = open || requiredOpen || checking;
  if (!visible) {
    return null;
  }

  return (
    <div className="server-dialog-backdrop">
      <div className="server-dialog card">
        <h3>Подключение к Raspberry</h3>
        <p>Боевой Operator работает через Raspberry с запущенным core. Укажи IP и, если включен, пароль оператора.</p>
        <input
          className="server-dialog-input"
          value={inputIp}
          onChange={(event) => setInputIp(event.target.value)}
          placeholder="192.168.0.177"
          autoFocus
        />
        <input
          className="server-dialog-input"
          value={inputPassword}
          onChange={(event) => setInputPassword(event.target.value)}
          placeholder="Пароль оператора"
          type="password"
        />
        {error ? <div className="server-dialog-error">{error}</div> : null}
        <div className="footer-actions">
          {!requiredOpen && !checking ? (
            <button
              className="btn-muted"
              type="button"
              onClick={() => {
                onClose?.();
              }}
            >
              Закрыть
            </button>
          ) : null}
          <button className="btn-primary" type="button" onClick={handleSave} disabled={checking}>
            {checking ? "Проверка..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
