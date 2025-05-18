import { useState, useRef, useEffect } from 'react';
import { Button, Paper, Text, Group, Stack, Alert } from '@mantine/core';
import jsQR from 'jsqr';
import { parseOtpUri } from '../utils/otp';

interface QRCodeScannerProps {
  onScan: (uri: string) => void;
  onClose: () => void;
}

export default function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 启动摄像头
  const startCamera = async () => {
    try {
      setError(null);
      setScanning(true);

      // 获取摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;

      // 设置视频源
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setScanning(false);
      setError('无法访问摄像头，请确保已授予摄像头权限。');
      console.error('摄像头访问失败:', err);
    }
  };

  // 停止摄像头
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setScanning(false);
  };

  // 扫描二维码
  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // 确保视频已加载
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // 设置画布大小
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 绘制视频帧到画布
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 获取图像数据
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // 使用 jsQR 解析二维码
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      // 如果找到二维码
      if (code) {
        // 检查是否是 OTP URI
        if (code.data.startsWith('otpauth://')) {
          try {
            // 尝试解析 OTP URI
            parseOtpUri(code.data);

            // 停止扫描
            stopCamera();

            // 调用回调函数
            onScan(code.data);
          } catch (err) {
            setError('无效的 OTP 二维码');
            console.error('解析 OTP URI 失败:', err);
          }
        } else {
          setError('扫描到的二维码不是有效的 OTP 二维码');
        }
      }
    }

    // 继续扫描
    requestAnimationFrame(scanQRCode);
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 停止摄像头（如果正在运行）
    stopCamera();

    // 清除错误
    setError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            setError('无法创建画布上下文');
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;

          context.drawImage(img, 0, 0, img.width, img.height);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

          // 尝试多种解码方法
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth', // 尝试正常和反转颜色
          });

          if (code && code.data.startsWith('otpauth://')) {
            try {
              // 尝试解析 OTP URI
              parseOtpUri(code.data);

              // 调用回调函数
              onScan(code.data);
            } catch (err) {
              setError('无效的 OTP 二维码');
              console.error('解析 OTP URI 失败:', err);
            }
          } else {
            setError('上传的图片不包含有效的 OTP 二维码');
            console.log('未检测到二维码或二维码不是OTP格式', code?.data);
          }
        } catch (err) {
          setError('处理图片时出错');
          console.error('处理图片失败:', err);
        }
      };

      img.onerror = () => {
        setError('无法加载图片');
        console.error('图片加载失败');
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      setError('读取文件失败');
      console.error('文件读取失败');
    };

    reader.readAsDataURL(file);

    // 重置文件输入，以便用户可以再次选择同一个文件
    event.target.value = '';
  };

  // 开始扫描
  useEffect(() => {
    if (scanning) {
      scanQRCode();
    }
  }, [scanning]);

  // 组件卸载时停止摄像头
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack>
        <Text fw={500} size="lg">扫描二维码</Text>

        {error && (
          <Alert color="red" title="错误" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              display: scanning ? 'block' : 'none',
              borderRadius: '8px',
            }}
            playsInline
          />
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />

          {!scanning && (
            <div
              style={{
                width: '100%',
                height: '300px',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text c="dimmed">点击"开始扫描"按钮启动摄像头</Text>
            </div>
          )}
        </div>

        <Group justify="center">
          {!scanning ? (
            <Button onClick={startCamera}>开始扫描</Button>
          ) : (
            <Button color="red" onClick={stopCamera}>停止扫描</Button>
          )}
        </Group>

        <Text ta="center" size="sm">或者</Text>

        <Group justify="center">
          <Button
            variant="outline"
            onClick={() => {
              // 使用ref触发文件选择框
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            上传二维码图片
          </Button>
          {/* 隐藏的文件输入框 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </Group>

        <Button variant="subtle" onClick={onClose}>取消</Button>
      </Stack>
    </Paper>
  );
}
