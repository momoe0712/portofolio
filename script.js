// 1. Inisialisasi Slider Foto (Swiper.js)
var swiper = new Swiper(".mySwiper", {
    effect: "coverflow",
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: "auto",
    initialSlide:2,
    
    coverflowEffect: {
        rotate: 35,     
        stretch: -50,   
        depth: 300,     
        modifier: 1,
        slideShadows: true, 
    },
    
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
});

const lightbox = GLightbox({
    selector: '.glightbox'
});

// 2. Logika Akses Kamera
const video = document.getElementById('webcam');
const btnKamera = document.getElementById('start-cam');
const placeholder = document.getElementById('placeholder');
const labelPrediksi = document.getElementById('label-prediksi');
const skorPrediksi = document.getElementById('skor-prediksi');

let tfliteModel;
let IS_CAMERA_RUNNING = false;
let localStream = null;

async function loadTFLiteModel() {
    try {
        labelPrediksi.innerText = "Memuat Model AI...";
        tfliteModel = await tflite.loadTFLiteModel('./model.tflite');
        labelPrediksi.innerText = "Model AI Siap Digunakan";
        console.log("Model TFLite berhasil dimuat!");
    } catch (error) {
        console.error("Gagal memuat file model.tflite:", error);
        labelPrediksi.innerText = "Gagal memuat model (.tflite)";
    }
}

loadTFLiteModel();  

async function nyalakanKamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: 224, height: 224 }, 
            audio: false 
        });
        localStream = stream;
        video.srcObject = stream;

        placeholder.style.opacity = '0';
        setTimeout(() => placeholder.style.display = 'none', 500);

        btnKamera.textContent = "Matikan Kamera";
        btnKamera.classList.add("btn-danger");

        IS_CAMERA_RUNNING = true;
        
        video.onloadeddata = () => {
            klasifikasiLoop();
        };

    } catch (err) {
        console.error("Gagal membuka kamera: ", err);
        alert("Izin kamera ditolak browser atau perangkat Anda tidak memiliki kamera.");
    }
}

function matikanKamera() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    IS_CAMERA_RUNNING = false;
    video.srcObject = null;
    localStream = null;
    placeholder.style.display = 'flex';
    setTimeout(() => placeholder.style.opacity = '1', 10);

    labelPrediksi.innerText = "Kamera belum aktif";
    skorPrediksi.innerText = "0%";
    btnKamera.textContent = "Aktifkan Kamera";
    btnKamera.classList.remove("btn-danger");
}

btnKamera.addEventListener('click', () => {
    if (!IS_CAMERA_RUNNING) {
        nyalakanKamera();
    } else {
        matikanKamera();
    }
});

async function klasifikasiLoop() {
    if (!IS_CAMERA_RUNNING || !tfliteModel) return;
    const outputTensor = tf.browser.fromPixels(video);
    const resizedTensor = tf.image.resizeBilinear(outputTensor, [224, 224]).toFloat().expandDims(0);
    const prediksi = tfliteModel.predict(resizedTensor);
    const hasilData = await prediksi.data();
    const skorTertinggi = Math.max(...hasilData);
    const indeksTertinggi = hasilData.indexOf(skorTertinggi);
    const daftarLabel = ['Depan', 'Miring Kanan', 'Miring Kiri', 'Nunduk'];

    if (IS_CAMERA_RUNNING) { 
        labelPrediksi.innerText = daftarLabel[indeksTertinggi] || `Kelas (${indeksTertinggi})`;
        skorPrediksi.innerText = Math.round(skorTertinggi * 100) + "%";
    }

    outputTensor.dispose();
    resizedTensor.dispose();
    prediksi.dispose();

    requestAnimationFrame(klasifikasiLoop);
}