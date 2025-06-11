# 🎮 Hướng Dẫn Cài Model Nhân Vật

## 📥 Cách Tải Model Miễn Phí

### **1. Nguồn Model Tốt:**
- **Sketchfab** (có nhiều model miễn phí): https://sketchfab.com/
- **Mixamo** (nhân vật có animation): https://www.mixamo.com/
- **TurboSquid** (một số model free): https://www.turbosquid.com/Search/3D-Models/free
- **CGTrader** (có section free): https://www.cgtrader.com/free-3d-models

### **2. Từ Khóa Tìm Kiếm:**
```
"goku" "dragon ball" "anime character" "low poly character"
"robot" "warrior" "ninja" "pikachu" "pokemon"
"free download" "glb" "gltf" format
```

### **3. Format File Cần:**
- ✅ **GLB** (khuyến nghị - file đơn)  
- ✅ **GLTF** (có thể có nhiều file)
- ❌ Tránh: FBX, OBJ, 3DS (cần convert)

## 📁 Cách Cài Đặt

### **Bước 1: Tải Model**
1. Tải file `.glb` hoặc `.gltf` 
2. Đặt tên dễ nhớ: `goku.glb`, `robot.glb`, `pikachu.glb`

### **Bước 2: Copy vào Thư Mục**
Copy file vào thư mục: `public/models/`

### **Bước 3: Thêm vào Code**
Vào file `CharacterManager.js` và thêm:

```javascript
goku_model: {
    name: 'Son Goku 3D 🐉',
    isLocalModel: true,
    modelPath: '/models/goku.glb',
    color: '#ffa500',
    scale: { x: 1, y: 1, z: 1 }
}
```

## 🎯 Model Đề Xuất

### **Son Goku:**
- Tìm "goku low poly" trên Sketchfab
- Hoặc "dragon ball character"
- Size khuyến nghị: < 5MB

### **Robot:**
- Tìm "robot character low poly"
- Hoặc download từ THREE.js examples

### **Pikachu:**
- Tìm "pikachu 3d model free"
- Chọn low poly để load nhanh

## ⚡ Tips Quan Trọng

1. **Size File:** < 10MB mỗi model
2. **Poly Count:** < 10,000 triangles  
3. **Texture:** Đã được bake vào model
4. **Animation:** Không cần thiết (game chỉ dùng vị trí)
5. **License:** Đảm bảo free hoặc có quyền sử dụng

## 🔧 Nếu Model Không Load

1. Kiểm tra file có trong `public/models/`
2. Đảm bảo đường dẫn đúng: `/models/filename.glb`
3. Thử scale khác: `scale: { x: 0.1, y: 0.1, z: 0.1 }`
4. Check console log để xem lỗi

## 📚 Ví Dụ Hoàn Chỉnh

```javascript
// Trong CharacterManager.js
ironman: {
    name: 'Iron Man 🤖',
    isLocalModel: true,
    modelPath: '/models/ironman.glb',
    color: '#ff0000',
    scale: { x: 1.5, y: 1.5, z: 1.5 }
}
```

Sau khi thêm model, refresh browser và thử chọn nhân vật mới! 