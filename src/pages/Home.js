// src/pages/Home.js
import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";

// Thêm 2 import sau để dùng DatePicker
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

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

// Chuyển Firestore Timestamp hoặc Date → "dd/MM/yyyy"
const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Lấy key tháng "MM/YYYY"
const getMonthKey = (dateStr) => dateStr.slice(3);

export default function Home() {
  const [rows, setRows] = useState([]);         // tất cả bản ghi
  const [filtered, setFiltered] = useState([]); // sau khi filter
  const [months, setMonths] = useState([]);     // dropdown tháng
  const [depts, setDepts] = useState([]);       // dropdown bộ phận

  // state cho date-picker “Từ ngày” / “Đến ngày”
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate]     = useState(null);

  const [month, setMonth] = useState("all");
  const [dept, setDept]   = useState("all");
  const { enqueueSnackbar } = useSnackbar();

  // 1) Load dữ liệu attendance + lý do từ Firestore
  useEffect(() => {
    (async () => {
      try {
        const attSnap  = await getDocs(collection(db, "attendance"));
        const lateSnap = await getDocs(collection(db, "lateReasons"));
        const lateMap  = {};
        lateSnap.forEach((d) => { lateMap[d.id] = d.data(); });

        const all = attSnap.docs.map((d) => {
          const data    = d.data();
          const dateStr = toDateString(data.Ngày);
          return {
            id: d.id,
            ...data,
            Ngày: dateStr,
            monthKey: getMonthKey(dateStr),
            morning:   lateMap[d.id]?.morning   || "",
            afternoon: lateMap[d.id]?.afternoon || "",
            S1: data.S1 || "",
            S2: data.S2 || "",
            C1: data.C1 || "",
            C2: data.C2 || "",
          };
        });

        setRows(all);
        setMonths(Array.from(new Set(all.map((r) => r.monthKey))));
        setDepts(Array.from(new Set(all.map((r) => r["Tên bộ phận"]))));
      } catch (err) {
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
      }
    })();
  }, [enqueueSnackbar]);

  // 2) Filter khi rows / month / dept / lịch thay đổi
  useEffect(() => {
    let tmp = rows;

    // lọc theo tháng dropdown
    if (month !== "all") {
      tmp = tmp.filter((r) => r.monthKey === month);
    }

    // lọc theo phòng ban dropdown
    if (dept !== "all") {
      tmp = tmp.filter((r) => r["Tên bộ phận"] === dept);
    }

    // nếu đã chọn from/to:
    if (fromDate) {
      const fromStr = toDateString(fromDate);
      tmp = tmp.filter((r) => r.Ngày >= fromStr);
    }
    if (toDate) {
      const toStr = toDateString(toDate);
      tmp = tmp.filter((r) => r.Ngày <= toStr);
    }

    setFiltered(tmp);
  }, [rows, month, dept, fromDate, toDate]);

  // 3) Upload file mới, lưu attendance về Firestore
  const handleFileUpload = useCallback(
    async (rawRows) => {
      try {
        const formatted = rawRows.map((r) => {
          const dateStr  = convertExcelDateToJSDate(r["Ngày"]);          // "dd/MM/yyyy"
          const safeDate = dateStr.replace(/\//g, "-");                  // "dd-MM-yyyy"
          return {
            id: `${r["Tên nhân viên"]}_${safeDate}`,
            "Tên nhân viên": r["Tên nhân viên"],
            "Tên bộ phận":   r["Tên bộ phận"],
            Ngày:            dateStr,
            monthKey:        getMonthKey(dateStr),
            S1: convertExcelTimeToTimeString(r.S1),
            S2: convertExcelTimeToTimeString(r.S2),
            C1: convertExcelTimeToTimeString(r.C1),
            C2: convertExcelTimeToTimeString(r.C2),
            morning:   "",
            afternoon: "",
          };
        });

        // save lên Firestore
        await Promise.all(
          formatted.map((row) =>
            setDoc(doc(db, "attendance", row.id), row, { merge: true })
          )
        );
        enqueueSnackbar("Tải & lưu cloud thành công", { variant: "success" });

        // cập nhật state rows bao gồm cả cũ và mới
        setRows((prev) => {
          // giữ nguyên prev không thuộc tháng mới, rồi thêm formatted
          const other = prev.filter((r) => r.monthKey !== formatted[0].monthKey);
          return [...other, ...formatted];
        });
      } catch (err) {
        enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
      }
    },
    [enqueueSnackbar]
  );

  // 4) In bảng chấm công (theo filter hiện tại)
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
      {/* Upload Excel */}
      <FileUpload onFileUpload={handleFileUpload} />

      {/* Bộ lọc: Tháng và phòng ban */}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
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
      </Box>

      {/* Thanh tìm kiếm */}
      <FilterToolbar
        onSearchChange={(kw) => {
          const k = kw.toLowerCase();
          if (!k) {
            setFiltered(rows);
          } else {
            setFiltered(
              rows.filter((r) =>
                Object.values(r).some(
                  (v) => v && v.toString().toLowerCase().includes(k)
                )
              )
            );
          }
        }}
      />

      {/* Chọn khoảng in theo lịch */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box display="flex" gap={2} alignItems="center" mb={2}>
          <DatePicker
            label="Từ ngày"
            value={fromDate}
            onChange={setFromDate}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
          <DatePicker
            label="Đến ngày"
            value={toDate}
            onChange={setToDate}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
          <Button variant="contained" color="secondary" onClick={handlePrint}>
            IN THEO LỊCH
          </Button>
        </Box>
      </LocalizationProvider>

      {/* Nút in toàn bộ (theo filter tháng/phòng ban nếu chưa chọn lịch) */}
      <PrintButton onPrint={handlePrint} />

      {/* Bảng chấm công */}
      <AttendanceTable rows={filtered} onReasonSave={() => {}} />
    </>
  );
}