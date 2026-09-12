const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session is required']
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required']
  },

  // Snapshot of session info at the time of recording (intentional — archival)
  session: {
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    date: {
      type: Date,
      required: [true, 'Session date is required']
    },
    startTime: {
      type: String,
      trim: true
    },
    endTime: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['lecture', 'lab', 'workshop', 'exam', 'project', 'other'],
      default: 'lecture'
    },
    location: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },

  records: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'absent'
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    markedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    checkInTime: {
      type: Date,
      default: null
    }
  }]
}, {
  timestamps: true
});

// One attendance record per session
AttendanceSchema.index({ sessionId: 1 }, { unique: true });
AttendanceSchema.index({ groupId: 1, 'session.date': 1 });
AttendanceSchema.index({ 'records.student': 1 });

// Method to mark student attendance
AttendanceSchema.methods.markAttendance = function(studentId, status, markedBy, notes = null) {
  const existingRecord = this.records.find(
    r => r.student.toString() === studentId.toString()
  );

  if (existingRecord) {
    existingRecord.status   = status;
    existingRecord.markedBy = markedBy;
    existingRecord.markedAt = new Date();
    if (notes) existingRecord.notes = notes;
    if (status === 'present' || status === 'late') {
      existingRecord.checkInTime = new Date();
    }
  } else {
    this.records.push({
      student:     studentId,
      status,
      markedBy,
      markedAt:    new Date(),
      notes,
      checkInTime: (status === 'present' || status === 'late') ? new Date() : null
    });
  }
};

// Method to get attendance for a student
AttendanceSchema.methods.getStudentAttendance = function(studentId) {
  return this.records.find(
    r => r.student.toString() === studentId.toString()
  );
};

// Static: attendance summary for a student across all sessions in a group
AttendanceSchema.statics.getStudentSummary = async function(groupId, studentId, startingSessionNumber = 1) {
  const sessions = await this.find({
    groupId,
    'records.student': studentId
  });

  const summary = {
    totalSessions: sessions.length,
    present:       0,
    absent:        0,
    late:          0,
    percentage:    0
  };

  sessions.forEach(session => {
    const record = session.records.find(
      r => r.student.toString() === studentId.toString()
    );
    if (record) {
      if (record.status === 'present') summary.present++;
      else if (record.status === 'absent') summary.absent++;
      else if (record.status === 'late') summary.late++;
    }
  });

  if (summary.totalSessions > 0) {
    const attended = summary.present + summary.late;
    const { computeAttendanceWithStartingSessions } = require('../utils/attendance.helpers');
    summary.percentage = computeAttendanceWithStartingSessions(
      attended,
      summary.totalSessions,
      startingSessionNumber
    );
  }

  return summary;
};

// Static: all attendance records for a group
AttendanceSchema.statics.getGroupOverview = async function(groupId) {
  return this.find({ groupId })
    .populate('records.student', 'name email')
    .sort({ 'session.date': -1 });
};

module.exports = mongoose.model('Attendance', AttendanceSchema);
