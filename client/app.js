const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";
const form = document.querySelector("#auth-form");
const title = document.querySelector("#form-title");
const subtitle = document.querySelector(".subtitle");
const username = document.querySelector("#username");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const submit = document.querySelector("#submit");
const message = document.querySelector("#message");
const modeToggle = document.querySelector("#mode-toggle");
let isRegistering = false;

const redirectIfAuthenticated = async () => {
  const token = localStorage.getItem("auth_token");
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      window.location.replace("/home.html");
      return;
    }
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  } catch {
    // Keep the login form available when the API is temporarily offline.
  }
};

redirectIfAuthenticated();

document.querySelector("#toggle-password").addEventListener("click", (event) => {
  const isHidden = password.type === "password";
  password.type = isHidden ? "text" : "password";
  event.currentTarget.textContent = isHidden ? "ซ่อน" : "แสดง";
});

modeToggle.addEventListener("click", () => {
  isRegistering = !isRegistering;
  form.classList.toggle("register", isRegistering);
  title.textContent = isRegistering ? "สร้างบัญชีใหม่" : "ยินดีต้อนรับกลับมา";
  subtitle.textContent = isRegistering ? "เริ่มต้นค้นพบเพลงที่ใช่สำหรับคุณ" : "เข้าสู่ระบบเพื่อฟังต่อจากที่คุณค้างไว้";
  submit.textContent = isRegistering ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
  modeToggle.textContent = isRegistering ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
  username.required = isRegistering;
  password.autocomplete = isRegistering ? "new-password" : "current-password";
  message.textContent = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  if (!form.checkValidity()) return form.reportValidity();
  if (isRegistering && password.value.length < 8) {
    message.textContent = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    return;
  }
  submit.disabled = true;
  submit.textContent = "กำลังดำเนินการ…";
  try {
    const body = { email: email.value, password: password.value };
    if (isRegistering) body.username = username.value;
    const response = await fetch(`${API_URL}/${isRegistering ? "register" : "login"}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "ไม่สามารถดำเนินการได้");
    localStorage.setItem("auth_token", result.token);
    localStorage.setItem("auth_user", JSON.stringify(result.user));
    window.location.assign("/home.html");
  } catch (error) {
    message.style.color = "#ff9cac";
    message.textContent = error.message === "Failed to fetch" ? "เชื่อมต่อ API ไม่ได้ กรุณาเปิดเซิร์ฟเวอร์ก่อน" : error.message;
  } finally {
    submit.disabled = false;
    submit.textContent = isRegistering ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
  }
});
