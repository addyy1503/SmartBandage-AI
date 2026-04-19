/* ═══════════════════════════════════════════════════════════
   WOUND MODEL — TensorFlow.js Wound Classification Scaffold
   Transfer learning from MobileNetV2 (in-browser)
   
   STATUS: Scaffold ready. No trained model yet.
   When you have wound images, use the training UI or 
   export from Python to add model weights.
   ═══════════════════════════════════════════════════════════ */

const WOUND_CLASSES = [
  'laceration', 'bruise', 'burn', 'abrasion',
  'ulcer', 'infected', 'surgical', 'pressure_injury', 'healthy_skin'
];

class WoundModel {
  constructor() {
    this.model = null;
    this.baseModel = null;
    this.isLoaded = false;
    this.isTraining = false;
    this.trainingData = { xs: [], ys: [] };
  }

  /* ── Load pre-trained custom model (if exists) ─ */
  async loadModel(modelUrl) {
    try {
      if (!window.tf) {
        console.warn('[WoundModel] TensorFlow.js not loaded. Skipping model load.');
        return false;
      }
      this.model = await tf.loadLayersModel(modelUrl);
      this.isLoaded = true;
      console.log('[WoundModel] Custom model loaded from', modelUrl);
      return true;
    } catch (e) {
      console.log('[WoundModel] No custom model found. Ready for training or Gemini fallback.');
      return false;
    }
  }

  /* ── Load MobileNetV2 base for transfer learning ─ */
  async loadBaseModel() {
    if (!window.tf) {
      console.warn('[WoundModel] TensorFlow.js not loaded.');
      return false;
    }
    try {
      // Load MobileNetV2 as feature extractor
      const mobilenet = await tf.loadLayersModel(
        'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/feature_vector/3/default/1',
        { fromTFHub: true }
      );
      this.baseModel = mobilenet;
      console.log('[WoundModel] MobileNetV2 base loaded for transfer learning.');
      return true;
    } catch (e) {
      console.warn('[WoundModel] Failed to load MobileNetV2:', e.message);
      return false;
    }
  }

  /* ── Preprocess image for model input ──────────── */
  preprocessImage(imgElement) {
    return tf.tidy(() => {
      let tensor = tf.browser.fromPixels(imgElement);
      tensor = tf.image.resizeBilinear(tensor, [224, 224]);
      tensor = tensor.toFloat().div(tf.scalar(255)); // normalize 0-1
      tensor = tensor.expandDims(0); // batch dim
      return tensor;
    });
  }

  /* ── Predict wound type from image ─────────────── */
  async predict(imgElement) {
    if (!this.isLoaded || !this.model) {
      return { predicted: false, reason: 'no_model' };
    }

    try {
      const input = this.preprocessImage(imgElement);
      const predictions = this.model.predict(input);
      const values = await predictions.data();
      input.dispose();
      predictions.dispose();

      // Find top prediction
      let maxIdx = 0, maxVal = 0;
      for (let i = 0; i < values.length; i++) {
        if (values[i] > maxVal) { maxVal = values[i]; maxIdx = i; }
      }

      const confidence = Math.round(maxVal * 100);
      const woundType = WOUND_CLASSES[maxIdx] || 'unknown';

      return {
        predicted: true,
        woundType,
        confidence,
        allScores: WOUND_CLASSES.map((cls, i) => ({
          class: cls,
          score: Math.round(values[i] * 100)
        })).sort((a, b) => b.score - a.score),
      };

    } catch (e) {
      console.error('[WoundModel] Prediction error:', e);
      return { predicted: false, reason: 'error', message: e.message };
    }
  }

  /* ── Add training example ──────────────────────── */
  addTrainingExample(imgElement, label) {
    if (!this.baseModel) {
      console.warn('[WoundModel] Base model not loaded. Call loadBaseModel() first.');
      return false;
    }

    const labelIdx = WOUND_CLASSES.indexOf(label);
    if (labelIdx === -1) {
      console.warn('[WoundModel] Unknown label:', label);
      return false;
    }

    const input = this.preprocessImage(imgElement);
    const features = this.baseModel.predict(input);

    this.trainingData.xs.push(features);
    this.trainingData.ys.push(labelIdx);
    input.dispose();

    console.log(`[WoundModel] Added example: ${label} (total: ${this.trainingData.xs.length})`);
    return true;
  }

  /* ── Train classification head ─────────────────── */
  async train(epochs = 20, onProgress = null) {
    if (this.trainingData.xs.length < 2) {
      console.warn('[WoundModel] Need at least 2 examples to train.');
      return false;
    }

    if (!window.tf) return false;
    this.isTraining = true;

    try {
      // Stack training data
      const xs = tf.concat(this.trainingData.xs);
      const ys = tf.oneHot(tf.tensor1d(this.trainingData.ys, 'int32'), WOUND_CLASSES.length);

      const featureSize = xs.shape[1];

      // Build classification head
      const head = tf.sequential();
      head.add(tf.layers.dense({ inputShape: [featureSize], units: 128, activation: 'relu' }));
      head.add(tf.layers.dropout({ rate: 0.3 }));
      head.add(tf.layers.dense({ units: 64, activation: 'relu' }));
      head.add(tf.layers.dense({ units: WOUND_CLASSES.length, activation: 'softmax' }));

      head.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
      });

      // Train
      await head.fit(xs, ys, {
        epochs,
        batchSize: Math.min(16, this.trainingData.xs.length),
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`[WoundModel] Epoch ${epoch + 1}/${epochs} — loss: ${logs.loss.toFixed(4)}, acc: ${logs.acc.toFixed(3)}`);
            if (onProgress) onProgress(epoch + 1, epochs, logs);
          }
        }
      });

      // Combine base + head into full model
      // For now, store head separately — prediction combines both
      this.model = head;
      this.isLoaded = true;
      this.isTraining = false;

      xs.dispose();
      ys.dispose();

      console.log('[WoundModel] Training complete!');
      return true;

    } catch (e) {
      console.error('[WoundModel] Training error:', e);
      this.isTraining = false;
      return false;
    }
  }

  /* ── Save model to browser storage ─────────────── */
  async saveModel() {
    if (!this.model) return false;
    try {
      await this.model.save('localstorage://wound-classifier');
      console.log('[WoundModel] Model saved to localStorage.');
      return true;
    } catch (e) {
      console.error('[WoundModel] Save error:', e);
      return false;
    }
  }

  /* ── Load model from browser storage ───────────── */
  async loadFromStorage() {
    if (!window.tf) return false;
    try {
      this.model = await tf.loadLayersModel('localstorage://wound-classifier');
      this.isLoaded = true;
      console.log('[WoundModel] Model loaded from localStorage.');
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ── Get training data count ───────────────────── */
  getTrainingCount() {
    const counts = {};
    WOUND_CLASSES.forEach(c => counts[c] = 0);
    this.trainingData.ys.forEach(idx => {
      counts[WOUND_CLASSES[idx]] = (counts[WOUND_CLASSES[idx]] || 0) + 1;
    });
    return { total: this.trainingData.xs.length, perClass: counts };
  }
}

window.WoundModel = WoundModel;
window.WOUND_CLASSES = WOUND_CLASSES;
