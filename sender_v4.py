import os
import time
import uuid
import base64
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


class PureJSWhatsAppSenderV4:
    def __init__(self, root):
        self.root = root
        self.root.title("WhatsApp Fee Sender v4.0 (Pure JS Engine - No Clipboard/Popup)")
        self.root.geometry("800x630")

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

        self.start_btn = tk.Button(btn_frame, text="▶ Start v4.0 JS Dispatch", bg="#15803d", fg="white", font=("Segoe UI", 10, "bold"), padx=15, pady=5, command=self.start_thread)
        self.start_btn.pack(side=tk.LEFT, padx=10)

        self.stop_btn = tk.Button(btn_frame, text="⏹ Stop & Save Progress", bg="#b91c1c", fg="white", font=("Segoe UI", 10, "bold"), padx=15, pady=5, command=self.stop_sending, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=10)

        # 5. Live System Console
        tk.Label(frame, text="System Console & Error Logs (v4.0 Engine):", font=("Segoe UI", 10, "bold")).grid(row=6, column=0, sticky="w")
        self.log_box = scrolledtext.ScrolledText(frame, width=90, height=16, bg="#0f172a", fg="#38bdf8", font=("Consolas", 9))
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
        """Saves progress safely even if the Excel file is accidentally open in MS Excel."""
        try:
            df.to_excel(excel_file, index=False)
        except PermissionError:
            backup_file = os.path.splitext(excel_file)[0] + "_status_backup.xlsx"
            df.to_excel(backup_file, index=False)
            self.log("WARN", f"Excel file is open in MS Excel! Progress saved to '{os.path.basename(backup_file)}' instead.")

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
            "आप इस QR कोड को स्कैन करके ऑनलाइन भुगतान कर सकते हैं। भुगतान के बाद कृपया रसीद या स्क्रीनशॉट इसी नंबर पर भेज दें।",
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
        """Inserts multi-line Hindi text directly into WhatsApp's Lexical editor via JS."""
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

    def js_drop_image_file(self, qr_abs_path):
        """Injects the image file directly into WhatsApp via synthetic Drag-and-Drop / Paste."""
        with open(qr_abs_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode('utf-8')

        ext = os.path.splitext(qr_abs_path)[1].lower()
        mime_type = "image/png" if ext == ".png" else "image/jpeg"
        filename = os.path.basename(qr_abs_path)

        self.driver.execute_script("""
            const b64Data = arguments[0];
            const contentType = arguments[1];
            const fileName = arguments[2];

            const byteCharacters = atob(b64Data);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            const blob = new Blob(byteArrays, {type: contentType});
            const file = new File([blob], fileName, {type: contentType, lastModified: new Date().getTime()});

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);

            // Method 1: Synthetic Paste on active chat box
            const activeBox = document.querySelector("#main footer div[contenteditable='true']") || document.activeElement;
            if (activeBox) {
                activeBox.focus();
                const pasteEvent = new ClipboardEvent('paste', {
                     bubbles: true,
                     cancelable: true,
                     clipboardData: dataTransfer
                });
                activeBox.dispatchEvent(pasteEvent);
            }
        """, b64_data, mime_type, filename)

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

        self.human_pause(1.2, 2.0)

        # STEP 2: Find main message input box & insert Hindi text via pure JS
        msg_box = self.driver.find_element(By.CSS_SELECTOR, "#main footer div[contenteditable='true']")
        msg_box.click()
        self.human_pause(0.5, 1.0)
        self.js_insert_text(msg_box, hindi_caption)
        self.human_pause(1.2, 2.0)

        # STEP 3: Inject QR Image directly via JS synthetic paste (No OS clipboard or popup menu needed!)
        self.js_drop_image_file(qr_abs_path)

        # STEP 4: Wait for Image Preview Modal & Send Button to render
        self.human_pause(3.0, 4.5)

        send_selectors = (
            "div[aria-label='Send'], "
            "button[aria-label='Send'], "
            "span[data-icon='send'], "
            "span[data-icon='wds-ic-send-filled']"
        )
        try:
            send_btn = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, send_selectors)))
            self.driver.execute_script("arguments[0].click();", send_btn)
        except TimeoutException:
            # Fallback: Press Enter key directly
            ActionChains(self.driver).send_keys(Keys.ENTER).perform()

        # Wait 4 seconds for image upload to complete
        self.human_pause(3.8, 5.2)

    def start_thread(self):
        if not self.excel_path.get() or not os.path.exists(self.excel_path.get()):
            messagebox.showerror("Validation Error", "Please select a valid Excel (.xlsx) file.")
            return
        if not self.qr_path.get() or not os.path.exists(self.qr_path.get()):
            messagebox.showerror("Validation Error", "Please select a valid QR Image (.jpg/.png) file.")
            return

        self.is_running = True
        self.start_btn.config(state=tk.DISABLED)
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

            self.log("INFO", f"[v4.0 Engine] Total Rows: {len(df)} | Eligible Pending Rows: {len(pending_indices)}")

            if not pending_indices:
                self.log("INFO", "All eligible records are already marked as SENT. Nothing to process.")
                return

            self.log("INFO", "Launching Stealth Chrome Browser...")
            self.driver = self.init_stealth_browser()
            self.driver.get("https://web.whatsapp.com")

            WebDriverWait(self.driver, 90).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[id='pane-side']"))
            )
            self.log("SUCCESS", "WhatsApp Web ready. Starting Pure-JS dispatch loop (v4.0)...")

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
                    self.log("INFO", f"Dispatching -> {student} (Phone: {phone}, Due: INR {amount})...")
                    self.send_single_message(phone, hindi_msg, qr_abs_path)

                    sent_in_session += 1
                    df.at[idx, 'Delivery_Status'] = "SENT"
                    df.at[idx, 'Sent_Timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    self.safe_save_excel(df, excel_file)

                    self.log("SUCCESS", f"Delivered to {student} ({phone}) | Session Count: {sent_in_session}/{len(pending_indices)}")

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

            self.log("INFO", f"Batch execution finished. Total messages sent in this session: {sent_in_session}")

        except Exception as e:
            self.log("CRITICAL", f"System Exception: {repr(e)}")
        finally:
            self.is_running = False
            self.close_driver_safely()
            self.start_btn.config(state=tk.NORMAL)
            self.stop_btn.config(state=tk.DISABLED)


if __name__ == "__main__":
    root = tk.Tk()
    app = PureJSWhatsAppSenderV4(root)
    root.mainloop()
