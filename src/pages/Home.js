// src/pages/Home.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

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

// helper: parse "dd/MM/yyyy" → JS Date
const parseDateDMY = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

// helper: format Firestore Timestamp/Date → "dd/MM/yyyy"
const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// lấy key tháng "MM/YYYY"
const getMonthKey = (dateStr) => dateStr.slice(3);

export default function Home() {
  const [rows, setRows] = useState([]);           // all records
  const [filtered, setFiltered] = useState([]);   // after month+dept filter
  const [months, setMonths] = useState([]);       // month dropdown
  const [depts, setDepts] = useState([]);         // dept dropdown
  const [month, setMonth] = useState("all");
  const [dept, setDept] = useState("all");
  const [fromDate, setFromDate] = useState(null); // custom print range
  const [toDate, setToDate] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // 1) Load attendance + lateReasons
  useEffect(() => {
    (async () => {
      try {
        const attSnap = await getDocs(collection(db, "attendance"));
        const lateSnap = await getDocs(collection(db, "lateReasons"));
        const lateMap = {};
        lateSnap.forEach((d) => (lateMap[d.id] = d.data()));

        const all = attSnap.docs.map((d) => {
          const data = d.data();
          const dateStr = toDateString(data.Ngày);
          return {
            id: d.id,
            ...data,
            Ngày: dateStr,
            monthKey: getMonthKey(dateStr),
            morning: lateMap[d.id]?.morning || "",
            afternoon: lateMap[d.id]?.afternoon || "",
            S1: data.S1 || "",
            S2: data.S2 || "",
            C1: data.C1 || "",
            C2: data.C2 || "",
          };
        });

        setRows(all);
        setMonths(Array.from(new Set(all.map((r) => r.monthKey))).sort());
        setDepts(Array.from(new Set(all.map((r) => r["Tên bộ phận"]))).sort());
      } catch (err) {
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
      }
    })();
  }, [enqueueSnackbar]);

  // 2) Filter khi rows / month / dept thay đổi
  useEffect(() => {
    let tmp = rows;
    if (month !== "all") tmp = tmp.filter((r) => r.monthKey === month);
    if (dept  !== "all") tmp = tmp.filter((r) => r["Tên bộ phận"] === dept);
    setFiltered(tmp);
  }, [rows, month, dept]);

  // 3) Upload file Excel mới
  const handleFileUpload = useCallback(
    async (rawRows) => {
      try {
        const formatted = rawRows.map((r) => {
          const dateStr = convertExcelDateToJSDate(r["Ngày"]);
          return {
            id: `${r["Tên nhân viên"]}_${dateStr}`,
            "Tên nhân viên": r["Tên nhân viên"],
            "Tên bộ phận": r["Tên bộ phận"],
            Ngày: dateStr,
            monthKey: getMonthKey(dateStr),
            S1: convertExcelTimeToTimeString(r.S1),
            S2: convertExcelTimeToTimeString(r.S2),
            C1: convertExcelTimeToTimeString(r.C1),
            C2: convertExcelTimeToTimeString(r.C2),
            morning: "",
            afternoon: "",
          };
        });

        await Promise.all(
          formatted.map((row) =>
            setDoc(doc(db, "attendance", row.id), row, { merge: true })
          )
        );
        enqueueSnackbar("Tải & lưu cloud thành công", { variant: "success" });

        // cập nhật local state để giữ ghi chú cũ và bản mới
        setRows((prev) => {
          const other = prev.filter((r) => r.monthKey !== formatted[0].monthKey);
          return [...other, ...formatted];
        });
      } catch {
        enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
      }
    },
    [enqueueSnackbar]
  );

  // 4a) In theo filter hiện tại
  const handlePrint = () => {
    if (!filtered.length) {
      enqueueSnackbar("Chưa có dữ liệu để in", { variant: "warning" });
      return;
    }
    printStyledAttendance(filtered, dept === "all" ? "Tất cả" : dept);
  };

  // 4b) In theo khoảng ngày tự chọn
  const handlePrintRange = () => {
    if (!fromDate || !toDate) {
      enqueueSnackbar("Vui lòng chọn cả Từ và Đến ngày", { variant: "warning" });
      return;
    }
    if (toDate < fromDate) {
      enqueueSnackbar("Ngày Đến phải sau Ngày Từ", { variant: "warning" });
      return;
    }
    // lọc tất cả bản ghi theo khoảng (dựa vào rows, không phụ thuộc month/dept)
    const rangeRows = rows.filter((r) => {
      const d = parseDateDMY(r.Ngày);
      return d >= fromDate && d <= toDate;
    });
    if (!rangeRows.length) {
      enqueueSnackbar("Không có dữ liệu trong khoảng này", { variant: "warning" });
      return;
    }
    printStyledAttendance(
      rangeRows,
      `Từ ${fromDate.getDate()}/${fromDate.getMonth()+1} đến ${toDate.getDate()}/${toDate.getMonth()+1}`
    );
  };

  return (
    <>
      <FileUpload onFileUpload={handleFileUpload} />

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

      <FilterToolbar
        onSearchChange={(kw) => {
          const k = kw.toLowerCase();
          if (!k) return setFiltered(rows);
          setFiltered(
            rows.filter((r) =>
              Object.values(r).some(
                (v) =>
                  v &&
                  v.toString().toLowerCase().includes(k)
              )
            )
          );
        }}
      />

      {/* Chọn ngày để In theo lịch */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <DatePicker
            label="Từ ngày"
            value={fromDate}
            onChange={(d) => setFromDate(d)}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
          <DatePicker
            label="Đến ngày"
            value={toDate}
            onChange={(d) => setToDate(d)}
            renderInput={(params) => <TextField {...params} size="small" />}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={handlePrintRange}
          >
            In theo lịch
          </Button>
        </Box>
      </LocalizationProvider>

      {/* Nút in theo filter */}
      <Box mb={2}>
        <PrintButton onPrint={handlePrint}>
          In bảng chấm công
        </PrintButton>
      </Box>

      <AttendanceTable rows={filtered} onReasonSave={() => {}} />
    </>
  );
}
