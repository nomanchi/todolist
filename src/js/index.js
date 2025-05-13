import '../styles/common.css';

// 상수 정의
const IMMINENT_TIME = 6;

const SORT_TYPE = {
  INPUT_TIME: 'sort-by-input-time',
  REMAIN_TIME: 'sort-by-remain-time',
};

const SELECTORS = {
  CONTENT_INPUT: '#create-content-input',
  TIME_INPUT: '#create-time-input',
  TODO_LIST: '.todo-list .task-list',
  TODO_LIST_ITEM: '.todo-list .task',
  TODO_CHECKBOX: '.todo-list .task .todo-checkbox',
  TODO_MODIFY_BUTTON: '.todo-list .task .modify-button',
  DONE_LIST: '.done-list .task-list',
  DONE_LIST_ITEM: '.done-list .task',
  DONE_CHECKBOX: '.done-list .task .done-checkbox',
  CLEAR_STORAGE: '#clear-local-storage',
  CREATE_TODO: '#create-todo-button',
  DONE_ALL: '#done-all',
  DONE_SELECTED: '#done-selected',
  DONE_BUTTON: '.done-button',
  RESTORE_ALL: '#restore-all',
  RESTORE_SELECTED: '#restore-selected',
  RESTORE_BUTTON: '.restore-button',
  MODAL_MODIFY: '.modal-modify',
  MODAL_MODIFY_CANCEL_BUTTON: '.modal-modify .modal-buttons .cancel',
  MODAL_MODIFY_CONFIRM_BUTTON: '.modal-modify .modal-buttons .confirm',
  MODAL_MODIFY_ID_INPUT: '#modify-id-input',
  MODAL_MODIFY_CONTENT_INPUT: '#modify-content-input',
  MODAL_MODIFY_TIME_INPUT: '#modify-time-input',
  MODAL_DONE: '.modal-done',
  MODAL_DONE_CONTENT: '.modal-done .modal-content',
  MODAL_DONE_BUTTON: '.modal-done .modal-buttons .confirm',
};

// 상태 관리
const state = {
  todoList: [],
  doneList: [],
  sortType: SORT_TYPE.INPUT_TIME,
  checkedTodoList: [],
  checkedDoneList: [],
  isShowModal: false,
  intervalId: null,
};

// 유틸리티 함수
const utils = {
  validateInput: (content, time) => {
    console.log('validateInput content:', content);
    console.log('validateInput time:', time);
    if (!content?.trim()?.length) {
      alert('할 일을 입력해주세요.');
      return false;
    }
    if (!time || !/^\d+$/.test(time)) {
      alert('시간을 확인해주세요.');
      return false;
    }
    return true;
  },

  clearInput: () => {
    document.querySelector(SELECTORS.CONTENT_INPUT).value = '';
    document.querySelector(SELECTORS.TIME_INPUT).value = '';
  },

  saveToLocalStorage: (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  loadFromLocalStorage: (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  showModal: (modal) => {
    document.querySelector(modal).style.display = 'flex';
    state.isShowModal = true;
    todoManager.checkInterval();
  },

  hideModal: (modal) => {
    document.querySelector(modal).style.display = 'none';
    state.isShowModal = false;
    todoManager.checkInterval();
  },
};

// Todo 관련 함수
const todoManager = {
  createTodo: () => {
    const content = document.querySelector(SELECTORS.CONTENT_INPUT).value;
    const time = document.querySelector(SELECTORS.TIME_INPUT).value;

    console.log('createTodo content:', content);
    console.log('createTodo time:', time);

    if (!utils.validateInput(content, time)) return;

    const todo = {
      id: new Date().getTime(),
      content,
      time,
      remainTime: time,
    };

    state.todoList.push(todo);
    todoManager.sortTodoList(state.sortType);
    utils.saveToLocalStorage('todoList', state.todoList);
    utils.clearInput();
  },

  sortTodoList: (sortType) => {
    document.querySelector('.controls .active')?.classList.remove('active');
    document.getElementById(sortType).classList.add('active');

    switch (sortType) {
      case SORT_TYPE.INPUT_TIME:
        state.todoList.sort((a, b) => a.id - b.id);
        break;
      case SORT_TYPE.REMAIN_TIME:
        state.todoList.sort((a, b) => a.remainTime - b.remainTime);
        break;
    }

    state.sortType = sortType;
    utils.saveToLocalStorage('sortType', sortType);
    eventManager.initCheckbox();
    todoManager.updateTodoList();
  },

  getTodoElement: (todo) => {
    const isImminent = parseInt(todo.remainTime) < IMMINENT_TIME;
    return `
      <div class="task ${isImminent ? 'imminent' : ''}" id="todo-${todo.id}">
        <input type="checkbox" class="todo-checkbox" />
        <span>${todo.content}</span>
        <span class="time">${todo.remainTime}초</span>
        <button type="button" class="modify-button">수정</button>
        <button type="button" class="done-button">종료</button>
      </div>
    `;
  },

  modifyTodoTask: () => {
    const id = document.querySelector(SELECTORS.MODAL_MODIFY_ID_INPUT).value;
    const content = document.querySelector(SELECTORS.MODAL_MODIFY_CONTENT_INPUT).value;
    const time = document.querySelector(SELECTORS.MODAL_MODIFY_TIME_INPUT).value;

    const index = state.todoList.findIndex((_todo) => _todo.id === Number(id));
    state.todoList[index] = { ...state.todoList[index], content, time, remainTime: time };

    todoManager.sortTodoList(state.sortType);
    utils.saveToLocalStorage('todoList', state.todoList);
  },

  updateTodoList: () => {
    const todoListElement = document.querySelector(SELECTORS.TODO_LIST);
    todoListElement.innerHTML = state.todoList.map(todoManager.getTodoElement).join('');
    eventManager.attachTodoListEvents();

    document.querySelector(SELECTORS.DONE_SELECTED).disabled = !!!state.checkedTodoList.length;

    todoManager.checkInterval();
  },

  updateRemainTime: () => {
    const todoListElement = document.querySelector(SELECTORS.TODO_LIST);
    const _doneList = [];
    let content = '';
    let isShowModal = false;

    state.todoList.forEach((todo) => {
      todo.remainTime--;

      const taskElement = todoListElement.querySelector(`#todo-${todo.id}`);
      taskElement.querySelector('.time').textContent = `${todo.remainTime}초`;
      if (todo.remainTime < IMMINENT_TIME) {
        taskElement.classList.add('imminent');

        if (todo.remainTime <= 0) {
          isShowModal = true;
          _doneList.push(todo);
          content += `<p>[${todo.content}] 아이템이 종료 되었습니다.</p>`;
          _doneList.forEach((done) => {});
        }
      }
    });

    if (_doneList.length) {
      todoManager.done(_doneList);
      document.querySelector(SELECTORS.MODAL_DONE_CONTENT).innerHTML = content;
      utils.showModal(SELECTORS.MODAL_DONE);
    }
  },

  done: (todoList) => {
    todoList.forEach((todo) => {
      state.doneList.push(todo);
      state.todoList = state.todoList.filter((t) => t.id !== todo.id);
    });

    todoManager.sortTodoList(state.sortType);
    doneManager.updateDoneList();
    utils.saveToLocalStorage('todoList', state.todoList);
    utils.saveToLocalStorage('doneList', state.doneList);
    eventManager.initCheckbox();
  },

  interval: () => {
    state.intervalId = setInterval(() => {
      todoManager.updateRemainTime();
    }, 1000);
  },

  checkInterval: () => {
    if ((!state.todoList.length && state.intervalId !== null) || state.isShowModal) {
      clearInterval(state.intervalId);
      state.intervalId = null;
      return;
    }

    if (state.todoList.length && state.intervalId === null && !state.isShowModal) {
      todoManager.interval();
    }
  },
};

// Done 관련 함수
const doneManager = {
  getDoneElement: (done) => `
    <div class="task" id="done-${done.id}">
      <input type="checkbox" class="done-checkbox" />
      <span>${done.content}</span>
      <span class="time">목표: ${done.time}초</span>
      <span class="time">소요: ${Number(done.time) - Number(done.remainTime)}초</span>
      <button type="button" class="restore-button">복원</button>
    </div>
  `,

  updateDoneList: () => {
    const doneListElement = document.querySelector(SELECTORS.DONE_LIST);
    doneListElement.innerHTML = state.doneList.map(doneManager.getDoneElement).join('');
    eventManager.attachDoneListEvents();

    document.querySelector(SELECTORS.RESTORE_SELECTED).disabled = !!!state.checkedDoneList.length;
  },

  restore: (doneList) => {
    doneList.forEach((done) => {
      state.todoList.push({ ...done, remainTime: done.time });
      state.doneList = state.doneList.filter((d) => d.id !== done.id);
    });

    todoManager.sortTodoList(state.sortType);
    doneManager.updateDoneList();
    utils.saveToLocalStorage('todoList', state.todoList);
    utils.saveToLocalStorage('doneList', state.doneList);
    eventManager.initCheckbox();
  },
};

// 이벤트 관리
const eventManager = {
  attachTodoListEvents: () => {
    document.querySelectorAll(SELECTORS.TODO_LIST_ITEM).forEach((task) => {
      task.addEventListener('click', (e) => {
        const checkbox = task.querySelector(SELECTORS.TODO_CHECKBOX);
        if (e.target.tagName !== 'INPUT') {
          checkbox.checked = !checkbox.checked;
        }
        const id = task.id.split('-')[1];
        const todo = state.todoList.find((t) => t.id === parseInt(id));

        if (checkbox.checked) {
          state.checkedTodoList.push(todo);
        } else {
          state.checkedTodoList = state.checkedTodoList.filter((t) => t.id !== todo.id);
        }

        document.querySelector(SELECTORS.DONE_SELECTED).disabled = !!!state.checkedTodoList.length;
      });
    });

    document.querySelectorAll(SELECTORS.DONE_BUTTON).forEach((button) => {
      const id = button.parentElement.id.split('-')[1];
      const todo = state.todoList.find((t) => t.id === parseInt(id));
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        todoManager.done([todo]);
      });
    });

    document.querySelectorAll(SELECTORS.TODO_MODIFY_BUTTON).forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = button.parentElement.id.split('-')[1];
        const todo = state.todoList.find((t) => t.id === parseInt(id));
        document.querySelector(SELECTORS.MODAL_MODIFY_ID_INPUT).value = todo.id;
        document.querySelector(SELECTORS.MODAL_MODIFY_CONTENT_INPUT).value = todo.content;
        document.querySelector(SELECTORS.MODAL_MODIFY_TIME_INPUT).value = todo.remainTime;
        utils.showModal(SELECTORS.MODAL_MODIFY);
      });
    });
  },

  attachDoneListEvents: () => {
    document.querySelectorAll(SELECTORS.DONE_LIST_ITEM).forEach((task) => {
      task.addEventListener('click', (e) => {
        const checkbox = task.querySelector(SELECTORS.DONE_CHECKBOX);
        if (e.target.tagName !== 'INPUT') {
          checkbox.checked = !checkbox.checked;
        }
        const id = task.id.split('-')[1];
        const done = state.doneList.find((d) => d.id === parseInt(id));

        if (checkbox.checked) {
          state.checkedDoneList.push(done);
        } else {
          state.checkedDoneList = state.checkedDoneList.filter((d) => d.id !== done.id);
        }

        document.querySelector(SELECTORS.RESTORE_SELECTED).disabled = !!!state.checkedDoneList.length;
      });
    });

    document.querySelectorAll(SELECTORS.RESTORE_BUTTON).forEach((button) => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = button.parentElement.id.split('-')[1];
        const done = state.doneList.find((d) => d.id === parseInt(id));
        doneManager.restore([done]);
      });
    });
  },

  initCheckbox: () => {
    document.querySelectorAll(SELECTORS.TODO_CHECKBOX).forEach((checkbox) => {
      checkbox.checked = false;
    });
    state.checkedTodoList = [];

    document.querySelectorAll(SELECTORS.DONE_CHECKBOX).forEach((checkbox) => {
      checkbox.checked = false;
    });
    state.checkedDoneList = [];
  },

  init: () => {
    // 로컬 스토리지 초기화
    document.querySelector(SELECTORS.CLEAR_STORAGE).addEventListener('click', () => {
      localStorage.clear();
      state.todoList = [];
      state.doneList = [];
      state.sortType = SORT_TYPE.INPUT_TIME;
      state.checkedTodoList = [];
      utils.clearInput();
      todoManager.updateTodoList();
      doneManager.updateDoneList();
    });

    // 할 일 생성
    document.querySelector(SELECTORS.CREATE_TODO).addEventListener('click', todoManager.createTodo);

    // 정렬 버튼
    Object.values(SORT_TYPE).forEach((sortType) => {
      document.getElementById(sortType).addEventListener('click', () => todoManager.sortTodoList(sortType));
    });

    // 일괄 처리 버튼
    document.querySelector(SELECTORS.DONE_ALL).addEventListener('click', () => todoManager.done(state.todoList));
    document
      .querySelector(SELECTORS.DONE_SELECTED)
      .addEventListener('click', () => todoManager.done(state.checkedTodoList));
    document.querySelector(SELECTORS.RESTORE_ALL).addEventListener('click', () => {
      doneManager.restore(state.doneList);
      todoManager.sortTodoList(state.sortType);
    });
    document
      .querySelector(SELECTORS.RESTORE_SELECTED)
      .addEventListener('click', () => doneManager.restore(state.checkedDoneList));

    // 페이지 언로드 시 저장
    window.addEventListener('unload', () => {
      utils.saveToLocalStorage('todoList', state.todoList);
      utils.saveToLocalStorage('sortType', state.sortType);
      utils.saveToLocalStorage('doneList', state.doneList);
    });

    // 모달 이벤트
    document.querySelector(SELECTORS.MODAL_MODIFY_CONFIRM_BUTTON).addEventListener('click', () => {
      todoManager.modifyTodoTask();
      utils.hideModal(SELECTORS.MODAL_MODIFY);
    });

    document.querySelector(SELECTORS.MODAL_MODIFY_CANCEL_BUTTON).addEventListener('click', () => {
      utils.hideModal(SELECTORS.MODAL_MODIFY);
    });

    document.querySelector(SELECTORS.MODAL_DONE_BUTTON).addEventListener('click', () => {
      utils.hideModal(SELECTORS.MODAL_DONE);
      todoManager.checkInterval();
    });
  },
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 로컬 스토리지에서 데이터 로드
  const loadedTodoList = utils.loadFromLocalStorage('todoList');
  if (loadedTodoList) state.todoList = loadedTodoList;

  state.sortType = utils.loadFromLocalStorage('sortType') || SORT_TYPE.INPUT_TIME;

  const loadedDoneList = utils.loadFromLocalStorage('doneList');
  if (loadedDoneList) state.doneList = loadedDoneList;

  // 초기 렌더링
  todoManager.sortTodoList(state.sortType);
  doneManager.updateDoneList();

  // 이벤트 리스너 초기화
  eventManager.init();
});
