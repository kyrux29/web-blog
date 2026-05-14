---
title: "1.1 - Basic command"
date: 2026-05-14
category: "Tutorial"
series: "Linux basic"
seriesOrder: 1
tags: []
draft: false
---

### **1. Lệnh làm việc với thư mục và tệp**

| Lệnh    | Mô tả                                                  | Ví dụ                                    |
| ------- | ------------------------------------------------------ | ---------------------------------------- |
| `pwd`   | Hiển thị đường dẫn hiện tại (print working directory)  | `pwd`                                    |
| `ls`    | Liệt kê các file và thư mục trong thư mục hiện tại     | `ls -l`, `ls -a`                         |
| `cd`    | Di chuyển đến thư mục khác                             | `cd /home/khanh`, `cd ..` (lùi 1 cấp)    |
| `mkdir` | Tạo thư mục mới                                        | `mkdir new_folder`                       |
| `rmdir` | Xóa thư mục trống                                      | `rmdir old_folder`                       |
| `rm`    | Xóa file hoặc thư mục (có thể dùng `-r` để xóa đệ quy) | `rm file.txt`, `rm -r folder`            |
| `cp`    | Sao chép file hoặc thư mục                             | `cp a.txt b.txt`, `cp -r dir1 dir2`      |
| `mv`    | Di chuyển hoặc đổi tên file/thư mục                    | `mv a.txt folder/`, `mv old.txt new.txt` |
| `touch` | Tạo file rỗng mới                                      | `touch newfile.txt`                      |
| `cat`   | Hiển thị nội dung file                                 | `cat file.txt`                           |
| `head`  | Xem vài dòng đầu file                                  | `head -n 5 file.txt`                     |
| `tail`  | Xem vài dòng cuối file                                 | `tail -n 5 file.txt`                     |

### **2. Lệnh quản lý hệ thống**

| Lệnh       | Mô tả                                         | Ví dụ               |
| ---------- | --------------------------------------------- | ------------------- |
| `sudo`     | Chạy lệnh với quyền quản trị (root)           | `sudo apt update`   |
| `shutdown` | Tắt máy                                       | `sudo shutdown now` |
| `reboot`   | Khởi động lại máy                             | `sudo reboot`       |
| `clear`    | Xóa màn hình terminal                         | `clear`             |
| `history`  | Xem lịch sử lệnh đã dùng                      | `history`           |
| `date`     | Hiển thị ngày giờ hiện tại                    | `date`              |
| `whoami`   | Hiển thị tên người dùng hiện tại              | `whoami`            |
| `uname`    | Thông tin hệ thống                            | `uname -a`          |
| `top`      | Xem tiến trình đang chạy (giống Task Manager) | `top`               |
| `ps`       | Hiển thị danh sách tiến trình                 | `ps aux`            |
| `kill`     | Dừng tiến trình theo PID                      | `kill 1234`         |

### **3. Quản lý gói (Debian/Ubuntu)**

| Lệnh          | Mô tả                  | Ví dụ                  |
| ------------- | ---------------------- | ---------------------- |
| `apt update`  | Cập nhật danh sách gói | `sudo apt update`      |
| `apt upgrade` | Cập nhật tất cả gói    | `sudo apt upgrade`     |
| `apt install` | Cài đặt phần mềm       | `sudo apt install vim` |
| `apt remove`  | Gỡ cài đặt phần mềm    | `sudo apt remove nano` |
| `apt search`  | Tìm kiếm gói           | `apt search python`    |

_(Nếu dùng Fedora/CentOS thì dùng `dnf` hoặc `yum` thay vì `apt`.)_

### **4. Mạng và kết nối**

| Lệnh                | Mô tả                     | Ví dụ                               |
| ------------------- | ------------------------- | ----------------------------------- |
| `ping`              | Kiểm tra kết nối đến host | `ping google.com`                   |
| `ifconfig` / `ip a` | Hiển thị thông tin mạng   | `ip a`                              |
| `curl`              | Gửi request HTTP          | `curl https://example.com`          |
| `wget`              | Tải file từ Internet      | `wget https://example.com/file.zip` |
| `ssh`               | Kết nối đến máy chủ từ xa | `ssh user@192.168.1.10`             |

***

### **5. Tìm kiếm và thao tác nội dung**

| Lệnh   | Mô tả                            | Ví dụ                      |
| ------ | -------------------------------- | -------------------------- |
| `find` | Tìm file theo tên hoặc điều kiện | `find /home -name "*.txt"` |
| `grep` | Tìm chuỗi trong file             | `grep "error" logfile.txt` |
| `wc`   | Đếm dòng, từ, ký tự              | `wc -l file.txt`           |
| `sort` | Sắp xếp nội dung                 | `sort names.txt`           |
| `uniq` | Loại bỏ dòng trùng lặp           | `uniq names.txt`           |

### **6. Phân quyền và người dùng**

| Lệnh      | Mô tả                        | Ví dụ                       |
| --------- | ---------------------------- | --------------------------- |
| `chmod`   | Thay đổi quyền truy cập file | `chmod 755 script.sh`       |
| `chown`   | Đổi chủ sở hữu file          | `sudo chown khanh file.txt` |
| `adduser` | Thêm người dùng mới          | `sudo adduser newuser`      |
| `passwd`  | Đổi mật khẩu                 | `passwd`                    |

### **7. Lệnh nén và giải nén**

| Lệnh     | Mô tả                 | Ví dụ                          |
| -------- | --------------------- | ------------------------------ |
| `tar`    | Nén/Giải nén file tar | `tar -czf file.tar.gz folder/` |
| `gzip`   | Nén file              | `gzip file.txt`                |
| `gunzip` | Giải nén file         | `gunzip file.txt.gz`           |
| `zip`    | Nén file              | `zip archive.zip file1 file2`  |
| `unzip`  | Giải nén file zip     | `unzip archive.zip`            |

### **8. Một số phím tắt trong Terminal**

| Phím       | Tác dụng                              |
| ---------- | ------------------------------------- |
| `Ctrl + C` | Dừng lệnh đang chạy                   |
| `Ctrl + L` | Xóa màn hình (như `clear`)            |
| `Ctrl + A` | Di chuyển con trỏ về đầu dòng         |
| `Ctrl + E` | Di chuyển con trỏ về cuối dòng        |
| `Tab`      | Tự động hoàn thành lệnh hoặc tên file |