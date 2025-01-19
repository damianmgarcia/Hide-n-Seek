let _jobBoard;

const getJobBoard = () => {
  return _jobBoard;
};

const setJobBoard = (jobBoard) => (_jobBoard = jobBoard);

export { getJobBoard, setJobBoard };
