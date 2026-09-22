const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const token = localStorage.getItem('auth_token');

const form = document.querySelector('#track-form');
const title = document.querySelector('#form-title');
const statusBox = document.querySelector('#status');
const trackTableBody = document.querySelector('#track-table-body');
const submitBtn = document.querySelector('#submit-btn');
const resetBtn = document.querySelector('#reset-btn');
const logoutBtn = document.querySelector('#logout-btn');

const fields = {
  id: document.querySelector('#track-id'),
  title: document.querySelector('#title'),
  artist: document.querySelector('#artist'),
  album: document.querySelector('#album'),
  genre: document.querySelector('#genre'),
  description: document.querySelector('#description'),
  durationSec: document.querySelector('#durationSec'),
  isFeatured: document.querySelector('#isFeatured'),
  coverArt: document.querySelector('#coverArt'),
  audioUrl: document.querySelector('#audioUrl'),
  audioFile: document.querySelector('#audioFile'),
};

const redirectToLogin = () => window.location.replace('/');

const setStatus = (message, type = 'info') => {
  statusBox.textContent = message;
  statusBox.style.color = type === 'error' ? '#ffb3b3' : type === 'success' ? '#9ae6b4' : '#c4d2ff';
};

const ensureAccess = async () => {
  if (!token) {
    redirectToLogin();
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Unauthorized');
    }

    const result = await response.json();
    localStorage.setItem('auth_user', JSON.stringify(result.user));

    if (result.user.role !== 'admin') {
      setStatus('บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้า admin', 'error');
      window.setTimeout(() => redirectToLogin(), 1500);
      return false;
    }

    return true;
  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    redirectToLogin();
    return false;
  }
};

const formatDuration = (seconds) => {
  const safeSec = Number(seconds) || 0;
  const minutes = Math.floor(safeSec / 60);
  const remaining = safeSec % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
};

const resetForm = () => {
  fields.id.value = '';
  form.reset();
  fields.isFeatured.value = 'false';
  title.textContent = 'เพิ่มเพลงใหม่';
  submitBtn.textContent = 'บันทึกเพลง';
};

const renderTracks = (tracks) => {
  if (!tracks.length) {
    trackTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="color: var(--muted); text-align: center; padding: 24px;">ยังไม่มีเพลง</td>
      </tr>
    `;
    return;
  }

  trackTableBody.innerHTML = tracks.map((track) => `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          <img class="track-cover" src="${track.coverArt || 'https://placehold.co/80x80/171b2e/ffffff?text=♫'}" alt="${track.title}" />
          <div>
            <strong>${track.title}</strong><br>
            <small style="color: var(--muted);">${track.album || 'ไม่มีอัลบั้ม'}</small>
          </div>
        </div>
      </td>
      <td>${track.artist}</td>
      <td>${formatDuration(track.durationSec)} ${track.isFeatured ? '<span class="badge featured">Featured</span>' : ''}</td>
      <td>
        <div class="inline-actions">
          <button type="button" class="secondary-btn" data-edit="${track._id}">แก้ไข</button>
          <button type="button" class="danger-btn" data-delete="${track._id}">ลบ</button>
        </div>
      </td>
    </tr>
  `).join('');

  trackTableBody.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => loadTrackForEdit(button.dataset.edit));
  });

  trackTableBody.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => deleteTrack(button.dataset.delete));
  });
};

const fetchTracks = async () => {
  const response = await fetch(`${API_URL}/tracks`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('ไม่สามารถโหลดเพลงได้');
  }

  const tracks = await response.json();
  renderTracks(tracks);
};

const submitTrack = async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = {
    title: fields.title.value.trim(),
    artist: fields.artist.value.trim(),
    album: fields.album.value.trim(),
    genre: fields.genre.value.trim(),
    description: fields.description.value.trim(),
    durationSec: Number(fields.durationSec.value),
    isFeatured: fields.isFeatured.value === 'true',
    coverArt: fields.coverArt.value.trim(),
    audioUrl: fields.audioUrl.value.trim(),
  };

  submitBtn.disabled = true;
  const isEditing = !!fields.id.value;

  try {
    const url = `${API_URL}/tracks${isEditing ? `/${fields.id.value}` : ''}`;
    const method = isEditing ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'ไม่สามารถบันทึกเพลงได้');

    const selectedAudio = fields.audioFile.files[0];
    if (selectedAudio) {
      const audioForm = new FormData();
      audioForm.append('audio', selectedAudio);
      const uploadResponse = await fetch(`${API_URL}/tracks/${result._id}/audio`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: audioForm,
      });
      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadResult.message || 'อัปโหลดไฟล์ MP3 ไม่สำเร็จ');
    }

    setStatus(selectedAudio ? 'บันทึกเพลงและอัปโหลด MP3 เรียบร้อยแล้ว' : (isEditing ? 'อัปเดตเพลงเรียบร้อยแล้ว' : 'เพิ่มเพลงเรียบร้อยแล้ว'), 'success');
    resetForm();
    await fetchTracks();
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
};

const loadTrackForEdit = async (trackId) => {
  try {
    const response = await fetch(`${API_URL}/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const track = await response.json();

    if (!response.ok) throw new Error(track.message || 'ไม่พบเพลง');

    fields.id.value = track._id;
    fields.title.value = track.title;
    fields.artist.value = track.artist;
    fields.album.value = track.album || '';
    fields.genre.value = track.genre || '';
    fields.description.value = track.description || '';
    fields.durationSec.value = track.durationSec;
    fields.isFeatured.value = String(!!track.isFeatured);
    fields.coverArt.value = track.coverArt || '';
    fields.audioUrl.value = track.audioUrl || '';
    title.textContent = 'แก้ไขเพลง';
    submitBtn.textContent = 'อัปเดตเพลง';
    setStatus('กำลังแก้ไขเพลง', 'info');
  } catch (error) {
    setStatus(error.message, 'error');
  }
};

const deleteTrack = async (trackId) => {
  const confirmed = window.confirm('ยืนยันการลบเพลงนี้หรือไม่?');
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/tracks/${trackId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'ลบเพลงไม่สำเร็จ');

    setStatus('ลบเพลงเรียบร้อยแล้ว', 'success');
    await fetchTracks();
  } catch (error) {
    setStatus(error.message, 'error');
  }
};

form.addEventListener('submit', submitTrack);
resetBtn.addEventListener('click', resetForm);
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  redirectToLogin();
});

const initAdminPage = async () => {
  if (!(await ensureAccess())) return;
  try {
    await fetchTracks();
  } catch (error) {
    setStatus(error.message, 'error');
  }
};

initAdminPage();
