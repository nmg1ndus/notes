import os
import time
import uuid
import random
import threading
import urllib.parse
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


class PureJSWhatsAppUPISenderV4:
    def __init__(self, root):
        self.root = root
        self.root.title("WhatsApp Fee Sender v4.1 (Pure JS + Fixed Amount UPI Link)")
        self.root.geometry("820x630")

        self.excel_path = tk.StringVar()
        self.upi_id = tk.StringVar(value="MSVIHANVIDYAPEETH.eazypay@icici")
        self.payee_name = tk.StringVar(value="Vihan Vidyapeeth")
        self.is_running = False
        self.driver = None

        self.build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def build_ui(self):
        frame = tk.Frame(self.root, padx=15, pady=15)
        frame.pack(fill=tk.BOTH, expand=True)

        # 1. Excel Selection
        tk.Label(frame, text="1. Select Excel File (due list.xlsx):", font=("Segoe UI", 10, "bold")).grid(row=0, column=0, sticky="w")
        tk.Entry(frame, textvariable=self.excel_path, width=62).grid(row=1, column=0, pady=5, padx=(0, 10), sticky="w")
        tk.Button(frame, text="Browse Excel", width=15, command=self.select_excel).grid(row=1, column=1)

        # 2. UPI Configuration
        upi_frame = tk.LabelFrame(frame, text="2. School UPI Payment Configuration", font=("Segoe UI", 9, "bold"), padx=10, pady=8)
        upi_frame.grid(row=2, column=0, columnspan=2, sticky="we", pady=8)

        tk.Label(upi_frame, text="Merchant UPI ID:").grid(row=0, column=0, sticky="w")
        tk.Entry(upi_frame, textvariable=self.upi_id, width=38, font=("Consolas", 10, "bold")).grid(row=0, column=1, padx=(5, 15))

        tk.Label(upi_frame, text="School / Payee Name:").grid(row=0, column=2, sticky="w")
        tk.Entry(upi_frame, textvariable=self.payee_name, width=22).grid(row=0, column=3, padx=5)

        # 3. Anti-Ban Timing Parameters
        cfg_frame = tk.LabelFrame(frame, text="3. Anti-Ban Stealth Parameters", font=("Segoe UI", 9, "bold"), padx=10, pady=8)
        cfg_frame.grid(row=3, column=0, columnspan=2, sticky="we", pady=8)

        tk.Label(cfg_frame, text="Min Delay (s):").grid(row=0, column=0, sticky="w")
        self.min_delay = tk.Entry(cfg_frame, width=6)
        self.min_delay.insert(0, "18")
        self.min_delay.grid(row=0, column=1, padx=(5, 15))

        tk.Label(cfg_frame, text="Max Delay (s):").grid(row=0, column=2, sticky="w")
        self.max_delay = tk.Entry(cfg_frame, width=6)
        self.max_delay.insert(0, "38")
        self.max_delay.grid(row=0, column=3, padx=(5, 15))

        tk.Label(cfg_frame, text="Micro-Break Every (msgs):").grid(row=0, column=4, sticky="w")
        self.batch_size = tk.Entry(cfg_frame, width=6)
        self.batch_size.insert(0, "15")
        self.batch_size.grid(row=0, column=5, padx=5)

        # 4. Action Buttons
        btn_frame = tk.Frame(frame)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=8)

        self.start_btn = tk.Button(btn_frame, text="▶ Start v4.1 UPI Dispatch", bg="#15803d", fg="white", font=("Segoe UI", 10, "bold"), padx=14, pady=5, command=self.start_thread)
        self.start_btn.pack(side=tk.LEFT, padx=8)

        self.stop_btn = tk.Button(btn_frame, text="⏹ Stop & Save", bg="#b91c1c", fg="white", font=("Segoe UI", 10, "bold"), padx=14, pady=5, command=self.stop_sending, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=8)

        self.reset_btn = tk.Button(btn_frame, text="🔄 Reset 'SENT' Status in Excel", bg="#0369a1", fg="white", font=("Segoe UI", 9, "bold"), padx=10, pady=5, command=self.reset_excel_status)
        self.reset_btn.pack(side=tk.LEFT, padx=8)

        # 5. Live System Console
        tk.Label(frame, text="System Console & Error Logs (v4.1 UPI Link Engine):", font=("Segoe UI", 10, "bold")).grid(row=5, column=0, sticky="w")
        self.log_box = scrolledtext.ScrolledText(frame, width=92, height=16, bg="#0f172a", fg="#38bdf8", font=("Consolas", 9))
        self.log_box.grid(row=6, column=0, columnspan=2, pady=5)

    def log(self, level, message):
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_box.insert(tk.END, f"[{ts}] [{level}] {message}\n")
        self.log_box.see(tk.END)

    def select_excel(self):
        path = filedialog.askopenfilename(filetypes=[("Excel Files", "*.xlsx *.xls")])
        if path:
            self.excel_path.set(path)

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
            self.log("INFO", "Cleared 'SENT' status for all rows in Excel. Ready for fresh dispatch!")
        except PermissionError:
            messagebox.showerror("Permission Denied", "Please close 'due list.xlsx' in Microsoft Excel first!")

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
            self.log("WARN", f"Excel open in MS Excel! Progress saved to '{os.path.basename(backup_file)}'.")

    def build_upi_link(self, amount, reg_no, student_name):
        """Builds a fixed-amount UPI payment link with student Reg No in the transaction note."""
        pa = self.upi_id.get().strip()
        pn = urllib.parse.quote(self.payee_name.get().strip())
        clean_student = "".join(e for e in student_name if e.isalnum())[:10]
        tn = urllib.parse.quote(f"Fee Reg {reg_no} {clean_student}")
        # Fixed amount formatted to 2 decimal places as required by UPI specs
        am = f"{float(amount):.2f}"
        return f"upi://pay?pa={pa}&pn={pn}&am={am}&cu=INR&tn={tn}"

    def generate_complex_hindi_message(self, row):
        student = str(row['Student name']).strip()
        father = str(row['Father name']).strip()
        reg_no = str(row['Reg.no']).strip()
        cls = str(row['class']).strip()
        sec = str(row['sec']).strip()
        month = str(row['month']).strip()
        amount = int(float(row['amount']))

        upi_id_str = self.upi_id.get().strip()
        upi_deep_link = self.build_upi_link(amount, reg_no, student)

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
            f"आप नीचे दिए गए पेमेंट लिंक या स्कूल की आधिकारिक UPI ID के माध्यम से सीधे *₹{amount}* का ऑनलाइन भुगतान कर सकते हैं:\n\n🔗 *पेमेंट लिंक (₹{amount}):*\n{upi_deep_link}\n\n🏦 *School UPI ID:*\n{upi_id_str}\n\nभुगतान के बाद कृपया रसीद या स्क्रीनशॉट इसी नंबर पर भेज दें।",
            f"कृपया नीचे दिए गए UPI लिंक या UPI ID पर *₹{amount}* की बकाया फीस जमा करने का कष्ट करें एवं पेमेंट का स्क्रीनशॉट यहाँ शेयर करें:\n\n💳 *Direct Pay Link (₹{amount}):*\n{upi_deep_link}\n\n📌 *UPI ID:* {upi_id_str}",
            f"सुविधा के लिए स्कूल का फिक्स्ड अमाउंट (*₹{amount}*) पेमेंट लिंक नीचे दिया गया है। कृपया शुल्क जमा कर स्क्रीनशॉट भेजने की कृपा करें:\n\n👉 *UPI Pay Link:*\n{upi_deep_link}\n\n🏦 *Official UPI ID:* {upi_id_str}"
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
        """Inserts multi-line Hindi text & UPI link directly into WhatsApp's Lexical editor via JS."""
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

    def send_single_message(self, phone, hindi_message):
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

        # STEP 2: Find main message input box & insert Hindi text + UPI link via pure JS
        msg_box = self.driver.find_element(By.CSS_SELECTOR, "#main footer div[contenteditable='true']")
        msg_box.click()
        self.human_pause(0.4, 0.9)
        self.js_insert_text(msg_box, hindi_message)
        self.human_pause(1.0, 1.8)

        # STEP 3: Click Send button in footer (or press Enter)
        send_selectors = (
            "#main footer button[aria-label='Send'], "
            "#main footer div[aria-label='Send'], "
            "#main footer span[data-icon='send'], "
            "#main footer span[data-icon='wds-ic-send-filled']"
        )
        send_btns = self.driver.find_elements(By.CSS_SELECTOR, send_selectors)
        if send_btns:
            self.driver.execute_script("arguments[0].click();", send_btns[-1])
        else:
            ActionChains(self.driver).send_keys(Keys.ENTER).perform()

        # Wait 2.5 seconds to confirm message dispatch before moving to next number
        self.human_pause(2.5, 3.8)

    def start_thread(self):
        if not self.excel_path.get() or not os.path.exists(self.excel_path.get()):
            messagebox.showerror("Validation Error", "Please select a valid Excel (.xlsx) file.")
            return
        if not self.upi_id.get().strip():
            messagebox.showerror("Validation Error", "Please enter a valid School UPI ID.")
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

            self.log("INFO", f"[v4.1 UPI Engine] Total Rows: {len(df)} | Eligible Pending Rows: {len(pending_indices)}")

            if not pending_indices:
                self.log("WARN", "All eligible rows are already marked 'SENT'! Click 'Reset SENT Status' button to resend.")
                return

            self.log("INFO", "Launching Stealth Chrome Browser...")
            self.driver = self.init_stealth_browser()
            self.driver.get("https://web.whatsapp.com")

            WebDriverWait(self.driver, 90).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div[id='pane-side']"))
            )
            self.log("SUCCESS", "WhatsApp Web ready. Starting Pure-JS UPI Link dispatch loop (v4.1)...")

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
                    self.log("INFO", f"Dispatching -> {student} (Phone: {phone}, Fixed UPI Due: INR {amount})...")
                    self.send_single_message(phone, hindi_msg)

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
            self.reset_btn.config(state=tk.NORMAL)
            self.stop_btn.config(state=tk.DISABLED)


if __name__ == "__main__":
    root = tk.Tk()
    app = PureJSWhatsAppUPISenderV4(root)
    root.mainloop()
