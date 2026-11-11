import os
import time
import uuid
import random
import threading
from datetime import datetime
import pandas as pd
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager


class WhatsAppQRAndTextSenderV5:
    def __init__(self, root):
        self.root = root
        self.root.title("WhatsApp Fee & QR Sender v5.0 (Verified Photo + Caption Engine)")
        self.root.geometry("820x640")

        self.excel_path = tk.StringVar()
        self.qr_path = tk.StringVar()
        self.is_running = False
        self.driver = None

        self.build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def build_ui(self):
        frame = tk.Frame(self.root, padx=15, pady=15)
        frame.pack(fill=tk.BOTH, expand=True)

        # 1. Excel Selection
        tk.Label(frame, text="1. Select Excel File (due list.xlsx):", font=("Segoe UI", 10, "bold")).grid(row=0, column=0, sticky="w")
        tk.Entry(frame, textvariable=self.excel_path, width=60).grid(row=1, column=0, pady=5, padx=(0, 10))
        tk.Button(frame, text="Browse Excel", width=14, command=self.select_excel).grid(row=1, column=1)

        # 2. QR Selection
        tk.Label(frame, text="2. Select Payment QR Image (qr.jpg):", font=("Segoe UI", 10, "bold")).grid(row=2, column=0, sticky="w", pady=(10, 0))
        tk.Entry(frame, textvariable=self.qr_path, width=60).grid(row=3, column=0, pady=5, padx=(0, 10))
        tk.Button(frame, text="Browse QR", width=14, command=self.select_qr).grid(row=3, column=1)

        # 3. Anti-Ban Timing Parameters
        cfg_frame = tk.LabelFrame(frame, text="Anti-Ban Stealth Parameters", font=("Segoe UI", 9, "bold"), padx=10, pady=8)
        cfg_frame.grid(row=4, column=0, columnspan=2, sticky="we", pady=10)

        tk.Label(cfg_frame, text="Min Delay (s):").grid(row=0, column=0, sticky="w")
        self.min_delay = tk.Entry(cfg_frame, width=6)
        self.min_delay.insert(0, "20")
        self.min_delay.grid(row=0, column=1, padx=(5, 15))

        tk.Label(cfg_frame, text="Max Delay (s):").grid(row=0, column=2, sticky="w")
        self.max_delay = tk.Entry(cfg_frame, width=6)
        self.max_delay.insert(0, "40")
        self.max_delay.grid(row=0, column=3, padx=(5, 15))

        tk.Label(cfg_frame, text="Micro-Break Every (msgs):").grid(row=0, column=4, sticky="w")
        self.batch_size = tk.Entry(cfg_frame, width=6)
        self.batch_size.insert(0, "15")
        self.batch_size.grid(row=0, column=5, padx=5)

        # 4. Action Buttons
        btn_frame = tk.Frame(frame)
        btn_frame.grid(row=5, column=0, columnspan=2, pady=8)

        self.start_btn = tk.Button(btn_frame, text="▶ Start v5.0 Dispatch (QR + Text)", bg="#15803d", fg="white", font=("Segoe UI", 10, "bold"), padx=12, pady=5, command=self.start_thread)
        self.start_btn.pack(side=tk.LEFT, padx=8)

        self.stop_btn = tk.Button(btn_frame, text="⏹ Stop", bg="#b91c1c", fg="white", font=("Segoe UI", 10, "bold"), padx=12, pady=5, command=self.stop_sending, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=8)

        self.reset_btn = tk.Button(btn_frame, text="🔄 Reset 'SENT' Status in Excel", bg="#0369a1", fg="white", font=("Segoe UI", 9, "bold"), padx=10, pady=5, command=self.reset_excel_status)
        self.reset_btn.pack(side=tk.LEFT, padx=8)

        # 5. Live System Console
        tk.Label(frame, text="System Console & Error Logs (v5.0 Engine):", font=("Segoe UI", 10, "bold")).grid(row=6, column=0, sticky="w")
        self.log_box = scrolledtext.ScrolledText(frame, width=92, height=16, bg="#0f172a", fg="#4ade80", font=("Consolas", 9))
        self.log_box.grid(row=7, column=0, columnspan=2, pady=5)

    def log(self, level, message):
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_box.insert(tk.END, f"[{ts}] [{level}] {message}\n")
        self.log_box.see(tk.END)

    def select_excel(self):
        path = filedialog.askopenfilename(filetypes=[("Excel Files", "*.xlsx *.xls")])
        if path:
            self.excel_path.set(path)

    def select_qr(self):
        path = filedialog.askopenfilename(filetypes=[("Image Files", "*.jpg *.jpeg *.png")])
        if path:
            self.qr_path.set(path)

    def reset_excel_status(self):
        excel_file = self.excel_path.get()
        if not excel_file or not os.path.exists(excel_file):
            messagebox.showwarning("Warning", "Please select the Excel file first!")
            return
        try:
            df = pd.read_excel(excel_file)
            df['Delivery_Status'] = ""
            df['Sent_Timestamp'] = ""
            df.to_excel(excel_file, index=False)
            self.log("INFO", "Successfully cleared 'SENT' status for all rows in Excel. Ready to re-send!")
        except PermissionError:
            messagebox.showerror("Permission Denied", "Please close the Excel file in MS Excel first!")

    def stop_sending(self):
        self.is_running = False
        self.log("WARN", "Stop signal received. Halting safely after current contact...")

    def on_close(self):
        self.is_running = False
        self.close_driver_safely()
        self.root.destroy()

    def close_driver_safely(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None

    def safe_save_excel(self, df, excel_file):
        try:
            df.to_excel(excel_file, index=False)
        except PermissionError:
            backup_file = os.path.splitext(excel_file)[0] + "_status_backup.xlsx"
            df.to_excel(backup_file, index=False)
            self.log("WARN", f"Excel open in MS Excel! Saved progress to '{os.path.basename(backup_file)}'.")

    def generate_complex_hindi_message(self, row):
        student = str(row['Student name']).strip()
        father = str(row['Father name']).strip()
        reg_no = str(row['Reg.no']).strip()
        cls = str(row['class']).strip()
        sec = str(row['sec']).strip()
        month = str(row['month']).strip()
        amount = int(float(row['amount']))

        greetings = [
            f"नमस्ते {father} जी",
            f"सादर प्रणाम {father} जी",
            f"प्रिय अभिभावक ({father} जी), नमस्कार",
            f"आदरणीय {father} जी, सादर नमस्कार",
            f"नमस्कार {father} जी"
        ]

        bodies = [
            f"विद्यालय रिकॉर्ड के अनुसार आपके बच्चे *{student}* (Reg. No: {reg_no}, कक्षा: {cls}-{sec}) की माह *{month}* तक की देय शुल्क राशि *₹{amount}* लंबित है।",
            f"सूचित किया जाता है कि छात्र/छात्रा *{student}* (कक्षा {cls}-{sec}, Reg: {reg_no}) का *{month}* माह तक का विद्यालय शुल्क *₹{amount}* बकाया है।",
            f"आपके सुपुत्र/सुपुत्री *{student}* (कक्षा: {cls}-{sec}, पंजीकरण संख्या: {reg_no}) की *{month}* माह तक की कुल बकाया फीस *₹{amount}* है।",
            f"यह एक सामान्य अनुस्मारक (Reminder) है कि *{student}* (Class: {cls}-{sec}, Reg No: {reg_no}) की माह *{month}* तक की स्कूल फीस *₹{amount}* जमा होनी शेष है।"
        ]

        ctas = [
            "आप ऊपर दिए गए QR कोड को स्कैन करके ऑनलाइन भुगतान कर सकते हैं। भुगतान के बाद कृपया रसीद या स्क्रीनशॉट इसी नंबर पर भेज दें।",
            "कृपया संलग्न QR कोड के माध्यम से बकाया शुल्क जमा करने का कष्ट करें एवं पेमेंट का स्क्रीनशॉट यहाँ शेयर करें।",
            "सुविधा के लिए स्कूल का पेमेंट QR कोड साथ में भेजा जा रहा है। कृपया शुल्क जमा कर स्क्रीनशॉट भेजने की कृपा करें।",
            "कृपया इस मैसेज में दिए गए QR कोड को स्कैन कर फीस जमा करें और कन्फर्मेशन के लिए स्क्रीनशॉट अवश्य भेजें।"
        ]

        closings = [
            "सहयोग के लिए धन्यवाद।",
            "सादर धन्यवाद, विद्यालय प्रशासन",
            "धन्यवाद, लेखा विभाग (Accounts Office)",
            "आपके सहयोग हेतु धन्यवाद।"
        ]

        zwsp = "".join(random.choices(["\u200b", "\u200c", ""], k=4))
        ref_token = uuid.uuid4().hex[:5].upper()

        msg = (
            f"{random.choice(greetings)},\n\n"
            f"{random.choice(bodies)}{zwsp}\n\n"
            f"{random.choice(ctas)}\n\n"
            f"{random.choice(closings)} (Ref: #{ref_token})"
        )
        return msg

    def human_pause(self, min_sec=0.8, max_sec=1.8):
        time.sleep(random.uniform(min_sec, max_sec))

    def init_stealth_browser(self):
        self.close_driver_safely()
        session_dir = os.path.abspath("./whatsapp_stealth_session")
        options = webdriver.ChromeOptions()
        options.add_argument(f"--user-data-dir={session_dir}")
        options.add_argument("--start-maximized")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        })
        return driver

    def js_insert_text(self, element, text):
        """Inserts Hindi text cleanly into WhatsApp's Lexical input box."""
        self.driver.execute_script("""
            const el = arguments[0];
            const text = arguments[1];
            el.focus();
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', text);
            const event = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
            });
            el.dispatchEvent(event);
        """, element, text)

    def send_single_message(self, phone, hindi_caption, qr_abs_path):
        url = f"https://web.whatsapp.com/send?phone=91{phone}"
        self.driver.get(url)

        wait = WebDriverWait(self.driver, 40)

        # STEP 1: Wait for chat footer OR Invalid Phone Number alert
        try:
            wait.until(lambda d: (
                len(d.find_elements(By.CSS_SELECTOR, "#main footer div[contenteditable='true']")) > 0 or
                len(d.find_elements(By.XPATH, "//*[contains(text(), 'Phone number shared via url is invalid')]")) > 0 or
                len(d.find_elements(By.XPATH, "//*[contains(text(), 'अमान्य')]")) > 0
            ))
        except TimeoutException:
            raise RuntimeError("Step 1 Timeout: Chat box did not load within 40 seconds.")

        if (self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Phone number shared via url is invalid')]") or
                self.driver.find_elements(By.XPATH, "//*[contains(text(), 'अमान्य')]")):
            raise ValueError("Phone number is not registered on WhatsApp.")

        self.human_pause(1.0, 1.8)

        # STEP 2: Click Attach Button ('+' or Paperclip icon)
        attach_selectors = (
            "span[data-icon='plus-rounded'], "
            "span[data-icon='plus'], "
            "span[data-icon='attach-menu-plus'], "
            "span[data-icon='clip'], "
            "div[title='Attach'], "
            "button[aria-label='Attach'], "
            "div[aria-label='Attach']"
        )
        try:
            attach_btn = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, attach_selectors)))
            self.driver.execute_script("arguments[0].click();", attach_btn)
        except TimeoutException:
            raise RuntimeError("Step 2 Timeout: Could not find Attach (+ / clip) button.")

        self.human_pause(1.0, 1.6)

        # STEP 3: Select ONLY the 'Photos & videos' file input (which accepts BOTH image AND video, NEVER 'New sticker')
        file_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
        photo_video_input = None

        for inp in file_inputs:
            accept_attr = (inp.get_attribute("accept") or "").lower()
            # Crucial fix: 'Photos & videos' has BOTH 'image' AND 'video' (New Sticker only has 'image')
            if "image" in accept_attr and "video" in accept_attr:
                photo_video_input = inp
                break

        if not photo_video_input:
            raise RuntimeError("Step 3 Error: 'Photos & videos' input[accept*='video'] not found in menu.")

        # Upload qr.jpg into Photos & Videos input
        photo_video_input.send_keys(qr_abs_path)

        # STEP 4: Wait specifically for the Image Preview Modal's Send Button (OUTSIDE #main footer)
        modal_send_xpath = (
            "//*[(@aria-label='Send' or @data-icon='send' or @data-icon='wds-ic-send-filled') "
            "and not(ancestor::footer)]"
        )
        try:
            modal_send_btn = wait.until(EC.presence_of_element_located((By.XPATH, modal_send_xpath)))
        except TimeoutException:
            raise RuntimeError("Step 4 Timeout: QR Image Preview Modal did not open properly.")

        self.human_pause(1.5, 2.5)

        # STEP 5: Locate the 'Add a caption' box inside the Image Preview Modal (excluding left search bar & bottom footer)
        caption_xpath = (
            "//div[@contenteditable='true' "
            "and not(ancestor::*[@id='side']) "
            "and not(ancestor::footer)]"
        )
        caption_boxes = self.driver.find_elements(By.XPATH, caption_xpath)
        if not caption_boxes:
            raise RuntimeError("Step 5 Error: Caption input box not found in Image Preview screen.")

        caption_box = caption_boxes[-1]
        caption_box.click()
        self.human_pause(0.4, 0.8)

        # Insert the Hindi message directly into the Image Caption Box
        self.js_insert_text(caption_box, hindi_caption)
        self.human_pause(1.5, 2.5)

        # STEP 6: Click the Modal Send Button to dispatch QR Image + Hindi Caption together!
        self.driver.execute_script("arguments[0].click();", modal_send_btn)

        # Wait 4.5 seconds for the image + caption upload to finish completely
        self.human_pause(4.2, 5.5)

    def start_thread(self):
        if not self.excel_path.get() or not os.path.exists(self.excel_path.get()):
            messagebox.showerror("Validation Error", "Please select a valid Excel (.xlsx) file.")
            return
        if not self.qr_path.get() or not os.path.exists(self.qr_path.get()):
            messagebox.showerror("Validation Error", "Please select a valid QR Image (.jpg/.png) file.")
            return

        self.is_running = True
        self.start_btn.config(state=tk.DISABLED)
        self.reset_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)

        threading.Thread(target=self.run_engine, daemon=True).start()

    def run_engine(self):
        try:
            excel_file = self.excel_path.get()
            df = pd.read_excel(excel_file)
            df.columns = df.columns.str.strip()

            if 'Delivery_Status' not in df.columns:
                df['Delivery_Status'] = ""
            if 'Sent_Timestamp' not in df.columns:
                df['Sent_Timestamp'] = ""

            df['Delivery_Status'] = df['Delivery_Status'].fillna("").astype(str)
            df['Sent_Timestamp'] = df['Sent_Timestamp'].fillna("").astype(str)

            pending_indices = df[
                (pd.to_numeric(df['amount'], errors='coerce') > 0) &
                (df['Delivery_Status'].str.upper() != 'SENT')
            ].index.tolist()

            self.log("INFO", f"[v5.0 Engine] Total Rows: {len(df)} | Eligible Pending Rows: {len(pending_indices)}")

            if not pending_indices:
                self.log("WARN", "All rows are already marked 'SENT'! Click 'Reset SENT Status in Excel' button to test again.")
                return

            self.log("INFO", "Launching Stealth Chrome Browser...")
            self.driver = self.init_stealth_browser()
            self.driver.get("https://web.whatsapp.com")

            WebDriverWait(self.driver, 90).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[id='pane-side']"))
            )
            self.log("SUCCESS", "WhatsApp Web ready. Starting QR + Caption dispatch loop (v5.0)...")

            qr_abs_path = os.path.abspath(self.qr_path.get())
            min_d = float(self.min_delay.get())
            max_d = float(self.max_delay.get())
            batch_limit = int(self.batch_size.get())

            sent_in_session = 0
            next_micro_break = random.randint(max(5, batch_limit - 3), batch_limit + 3)

            for idx in pending_indices:
                if not self.is_running:
                    break

                row = df.loc[idx]
                raw_phone = str(row['mobile no']).split('.')[0].strip()
                phone = ''.join(filter(str.isdigit, raw_phone))[-10:]
                student = str(row['Student name']).strip()
                amount = int(float(row['amount']))

                if len(phone) != 10:
                    self.log("ERROR", f"Row {idx+2} ({student}): Invalid 10-digit number '{raw_phone}'. Skipping.")
                    df.at[idx, 'Delivery_Status'] = "INVALID_NUMBER"
                    self.safe_save_excel(df, excel_file)
                    continue

                hindi_msg = self.generate_complex_hindi_message(row)

                try:
                    self.log("INFO", f"Dispatching QR + Msg -> {student} (Phone: {phone}, Due: INR {amount})...")
                    self.send_single_message(phone, hindi_msg, qr_abs_path)

                    sent_in_session += 1
                    df.at[idx, 'Delivery_Status'] = "SENT"
                    df.at[idx, 'Sent_Timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    self.safe_save_excel(df, excel_file)

                    self.log("SUCCESS", f"Delivered QR + Msg to {student} ({phone}) | Count: {sent_in_session}/{len(pending_indices)}")

                    if sent_in_session >= len(pending_indices):
                        break

                    if sent_in_session % 45 == 0:
                        cooldown = random.randint(480, 720)
                        self.log("COOLDOWN", f"45 messages reached. Entering cooldown for {cooldown // 60}m {cooldown % 60}s...")
                        time.sleep(cooldown)

                    elif sent_in_session >= next_micro_break:
                        m_break = random.randint(110, 210)
                        self.log("PAUSE", f"Micro-batch done ({sent_in_session} sent). Taking coffee break for {m_break}s...")
                        time.sleep(m_break)
                        next_micro_break = sent_in_session + random.randint(max(5, batch_limit - 3), batch_limit + 3)

                    else:
                        mean_d = (min_d + max_d) / 2
                        std_d = (max_d - min_d) / 4
                        jitter_delay = max(min_d, min(max_d + 10, random.gauss(mean_d, std_d)))
                        self.log("WAIT", f"Sleeping {jitter_delay:.1f}s before next contact...")
                        time.sleep(jitter_delay)

                except ValueError as ve:
                    self.log("ERROR", f"Skipped {student} ({phone}): {str(ve)}")
                    df.at[idx, 'Delivery_Status'] = "NOT_ON_WHATSAPP"
                    self.safe_save_excel(df, excel_file)
                    self.human_pause(3, 5)

                except Exception as ex:
                    err_msg = str(ex).splitlines()[0] if str(ex).strip() else repr(ex)
                    self.log("ERROR", f"Failed for {student} ({phone}) | {err_msg}")
                    df.at[idx, 'Delivery_Status'] = "FAILED_RETRY"
                    self.safe_save_excel(df, excel_file)
                    self.human_pause(4, 7)

            self.log("INFO", f"Batch execution finished. Total QR + messages sent: {sent_in_session}")

        except Exception as e:
            self.log("CRITICAL", f"System Exception: {repr(e)}")
        finally:
            self.is_running = False
            self.close_driver_safely()
            self.start_btn.config(state=tk.NORMAL)
            self.reset_btn.config(state=tk.NORMAL)
            self.stop_btn.config(state=tk.DISABLED)


if __name__ == "__main__":
    root = tk.Tk()
    app = WhatsAppQRAndTextSenderV5(root)
    root.mainloop()
