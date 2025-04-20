// src/pages/Home.js
import React, { useState, useEffect, useCallback } from "react";
import FileUpload from "../components/FileUpload";
import MonthFilter from "../components/MonthFilter";
import DepartmentFilter from "../components/DepartmentFilter";
import FilterToolbar from "../components/FilterToolbar";
import PrintButton from "../components/PrintButton";
import AttendanceTable from "../components/AttendanceTable";
import {
  convertExcelDateToJSDate,
  convertExcelTimeToTimeString,
} from "../utils/dateUtils";
import { printStyledAttendance } from "../utils/printUtils";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useSnackbar } from "notistack";

// Chuẩn hóa ngày từ Excel về "dd/MM/yyyy"
const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Lấy key tháng "MM/YYYY" từ "dd/MM/yyyy"
const getMonthKey = (dateStr) => dateStr.slice(3);

export default function Home() {
  const [rows, setRows] = useState([]);         // attendance + lý do
  const [filtered, setFiltered] = useState([]); // sau khi lọc tháng/bộ phận/tìm kiếm
  const [months, setMonths] = useState([]);     // danh sách tháng
  const [depts, setDepts] = useState([]);       // danh sách bộ phận
  const [month, setMonth] = useState("all");    // tháng chọn
  const [dept, setDept] = useState("all");      // bộ phận chọn
  const { enqueueSnackbar } = useSnackbar();

  // 1) Load attendance và lý do về, merge thành rows[]
  useEffect(() => {
    (async () => {
      enqueueSnackbar("Fetching attendance & lateReasons...", { variant: "info" });
      try {
        // load bảng chấm công
        const attSnap = await getDocs(collection(db, "attendance"));
        console.log("🔹 attendance docs:", attSnap.size);

        // load lý do
        const lateSnap = await getDocs(collection(db, "lateReasons"));
        console.log("🔹 lateReason docs:", lateSnap.size);

        const lateMap = {};
        lateSnap.forEach((d) => {
          lateMap[d.id] = d.data();
        });

        // merge
        const all = attSnap.docs.map((d) => {
          const data = d.data();
          const dateStr = toDateString(data.Ngày);
          const mk = getMonthKey(dateStr);
          const reason = lateMap[d.id] || {};
          return {
            id: d.id,
            ...data,
            Ngày: dateStr,
            monthKey: mk,
            morning: reason.morning || "",
            afternoon: reason.afternoon || "",
          };
        });
        setRows(all);
        console.log("✅ Loaded rows:", all.length);

        // build dropdown tháng
        const ms = Array.from(new Set(all.map((r) => r.monthKey))).sort(
          (a, b) => b.localeCompare(a)
        );
        setMonths(ms);

        // build dropdown bộ phận
        const ds = Array.from(
          new Set(all.map((r) => r["Tên bộ phận"]))
        ).sort();
        setDepts(ds);
      } catch (err) {
        console.error(err);
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
      }
    })();
  }, [enqueueSnackbar]);

  // 2) Khi rows/month/dept thay đổi → filter lại
  useEffect(() => {
    let temp = rows;
    if (month !== "all") {
      temp = temp.filter((r) => r.monthKey === month);
    }
    if (dept !== "all") {
      temp = temp.filter((r) => r["Tên bộ phận"] === dept);
    }
    setFiltered(temp);
  }, [rows, month, dept]);

  // 3) Xử lý upload file mới
  const handleFileUpload = useCallback(
    async (rawRows) => {
      try {
        const formatted = rawRows.map((r) => {
          // convert và sanitize date → dd-MM-yyyy (loại slash để làm ID)
          const dateStr = convertExcelDateToJSDate(r["Ngày"]); // "07/04/2025"
          const safeDate = dateStr.replace(/\//g, "-");        // "07-04-2025"
          return {
            id: `${r["Tên nhân viên"]}_${safeDate}`,           // no slash in ID
            "Tên nhân viên": r["Tên nhân viên"],
            "Tên bộ phận": r["Tên bộ phận"],
            Ngày: dateStr,
            monthKey: getMonthKey(dateStr),
            S1: convertExcelTimeToTimeString(r.S1),
            S2: convertExcelTimeToTimeString(r.S2),
            C1: convertExcelTimeToTimeString(r.C1),
            C2: convertExcelTimeToTimeString(r.C2),
          };
        });
        // lưu attendance lên cloud
        await Promise.all(
          formatted.map((row) =>
            setDoc(doc(db, "attendance", row.id), row, { merge: true })
          )
        );
        enqueueSnackbar("Tải & lưu cloud thành công", { variant: "success" });

        // cập nhật local state, giữ lý do cũ
        setRows((prev) => {
          const other = prev.filter((r) => r.monthKey !== month);
          const withReason = formatted.map((r) => ({
            ...r,
            morning: "",
            afternoon: "",
          }));
          return [...other, ...withReason];
        });
      } catch (err) {
        console.error(err);
        enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
      }
    },
    [enqueueSnackbar, month]
  );

  // 4) In bảng chấm công
  const handlePrint = () => {
    if (!filtered.length) {
      enqueueSnackbar("Chưa có dữ liệu để in", { variant: "warning" });
      return;
    }
    printStyledAttendance(
      filtered,
      dept === "all" ? "Tất cả" : dept
    );
  };

  return (
    <>
      <FileUpload onFileUpload={handleFileUpload} />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
        <MonthFilter
          months={months}
          value={month}
          onChange={setMonth}
          labels={{ all: "Tất cả" }}
        />
        <DepartmentFilter
          depts={depts}
          value={dept}
          onChange={setDept}
          labels={{ all: "Tất cả" }}
        />
      </div>

      <FilterToolbar
        onSearchChange={(kw) => {
          const k = kw.toLowerCase();
          if (!k) return setFiltered(rows);
          setFiltered((prev) =>
            prev.filter((r) =>
              Object.values(r).some(
                (v) =>
                  v &&
                  v.toString().toLowerCase().includes(k)
              )
            )
          );
        }}
      />

      <PrintButton onPrint={handlePrint} />

      <AttendanceTable rows={filtered} onReasonSave={() => {}} />
    </>
  );
}
