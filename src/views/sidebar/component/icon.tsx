import type { ReactNode } from "react";
import styles from "../css/icon.module.css";

/**
 * 纯展示用 SVG 容器，无点击事件、无 cursor、无 hover 效果。
 * 支持可选的无障碍标签 label，会被设置到容器的 aria-label。
 * @param color 指定图标颜色，默认使用 currentColor
 * @param label 可选的无障碍文本描述
 */
export const IconWrapStatic = ({
  color = "currentColor",
  label,
  children,
}: {
  color?: string;
  label?: string;
  children: ReactNode;
}) => (
  <div style={{ color }} className={styles.iconStatic} aria-label={label}>
    {children}
  </div>
);

export const IconWrapWithClick = ({
  label,
  color = "currentColor",
  children,
  onClick,
  variant = "small",
}: {
  label: string;
  color?: string;
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "tiny" | "small" | "large" | "pulse" | "wiggle";
}) => {
  const getClassName = () => {
    const baseClass = styles.actionBtn;

    switch (variant) {
      case "tiny":
        return `${styles.actionBtnTiny} ${styles.actionBtnAnimated}`;
      case "small":
        return `${styles.actionBtnSmall} ${styles.actionBtnAnimated}`;
      case "large":
        return styles.actionBtnLarge;
      case "pulse":
        return styles.actionBtnPulse;
      case "wiggle":
      default:
        return `${baseClass} ${styles.actionBtnAnimated}`;
    }
  };

  return (
    <div
      style={{ color }}
      className={getClassName()}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const ShareIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="分享" onClick={onClick}>
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="16 6 12 2 8 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        x2="12"
        y1="2"
        y2="15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

export const CopyIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="复制" onClick={onClick}>
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 12a2 2 0 012 2v28.222c0 .982-.836 1.778-1.867 1.778H7.867C6.836 44 6 43.204 6 42.222V13.778C6 12.796 6.836 12 7.867 12H32zm-2 4H10v24h20V16zM40 4a2 2 0 012 2v25a1 1 0 01-1 1h-2a1 1 0 01-1-1V8H19a1 1 0 01-1-1V5a1 1 0 011-1h21z"
        fill="currentColor"
      ></path>
    </svg>
  </IconWrapWithClick>
);
export const GenerateIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="生成" onClick={onClick}>
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"
        fill="currentColor"
      ></path>
      <path d="M9 12h6v2H9zm0 4h6v2H9z" fill="currentColor"></path>
    </svg>
  </IconWrapWithClick>
);
export const BookIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4H8M16 4V2M16 4V6M8 4V2M8 4V6M8 10H16M8 14H13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 删除图标：使用 small 变体统一尺寸到 28x28，与头部按钮一致。
 * 保留轻微 wiggle 动效（在 CSS 的 actionBtnAnimated 中实现）。
 */
export const CloseIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="删除" onClick={onClick} variant="small">
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 4L4 12M4 4L12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

export const FoldIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="收起" onClick={onClick}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8L8 4L4 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

export const ExpandIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="展开" onClick={onClick}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 8L8 12L12 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);
export const AddIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="新增" onClick={onClick} variant="pulse">
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 4V12M12 8H4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

/**
 * 添加（最小尺寸）：用于建议项的添加操作，采用 tiny 变体。
 * 尺寸更小更克制，避免占据过多空间。
 */
export const AddSmallIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="添加" onClick={onClick} variant="tiny">
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 3v10M13 8H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

/**
 * 编辑图标：使用 small 变体统一尺寸到 28x28，与头部按钮一致。
 * 保留轻微 wiggle 动效（在 CSS 的 actionBtnAnimated 中实现）。
 */
export const EditIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="编辑" onClick={onClick} variant="small">
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

export const SaveIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="保存" onClick={onClick}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="17,21 17,13 7,13 7,21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="7,3 7,8 15,8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

export const CancelIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="取消" onClick={onClick}>
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M15 9l-6 6M9 9l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

export const RegenerateIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="重新生成" onClick={onClick}>
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 4v6h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.51 15a9 9 0 102.13-9.36L1 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </IconWrapWithClick>
);

// 角色展开图标
export const RoleExpandIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="展开角色" onClick={onClick}>
    <svg
      className="icon"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
    >
      <path
        d="M959.67236 831.391525a31.976597 31.976597 0 0 1 28.459171 46.493973l-2.941847 4.668583-95.929791 127.906388a31.976597 31.976597 0 0 1-54.168356-33.44752l3.005801-4.924396 57.557874-76.743833H607.929791a31.976597 31.976597 0 0 1-31.464971-26.22081L575.953194 863.368122a31.976597 31.976597 0 0 1 26.22081-31.464971L607.929791 831.391525H959.67236zM492.814042 34.087053c143.255155 0 248.969785 105.778583 252.423257 242.190746 0 126.179652-47.773036 228.504763-133.022644 293.353302a273.080139 273.080139 0 0 0-70.732232 10.61623l-0.895345-3.837191c-6.842992-30.697533 10.232511-47.709083 17.01155-51.162556 51.162555-34.087053 116.011094-109.104149 116.011094-245.580266C673.609722 177.342208 595.139153 102.325111 492.814042 102.325111c-102.325111 0-180.79568 75.017097-180.79568 180.79568 0 112.557622 37.540525 194.417711 112.557621 245.580266 6.842992 3.389519 23.918495 20.465022 17.075503 54.552075-3.389519 20.465022-20.465022 58.005547-51.162555 61.395066-211.493213 30.697533-255.812777 180.79568-255.812777 214.882733 10.232511 27.308014 167.109697 61.395066 358.137888 61.395066h16.116205c8.633681 23.151056 20.592929 44.767236 35.174257 64.209007-18.866192 0.383719-36.197508 0.639532-51.290462 0.639532-129.633125 0-426.375946-13.685984-426.375946-129.633124 0-75.08105 75.08105-242.190747 303.585813-279.731272 3.389519 0 3.389519-3.389519 3.389519-3.389519-61.395066-47.773036-129.569172-136.412163-129.569172-293.353303C243.844256 139.865636 349.558887 34.087053 492.814042 34.087053zM723.045541 581.974068a31.976597 31.976597 0 0 1 9.40112 39.84284L729.44086 626.741304l-57.557874 76.743833H959.67236a31.976597 31.976597 0 0 1 31.464971 26.220809l0.511626 5.755788a31.976597 31.976597 0 0 1-26.22081 31.464972L959.67236 767.438331H607.929791a31.976597 31.976597 0 0 1-28.523124-46.493972L582.348514 716.275776l95.929791-127.906389a31.976597 31.976597 0 0 1 44.767236-6.395319z"
        fill="#2c2c2c"
      ></path>
    </svg>
  </IconWrapWithClick>
);

// 控制 历史记录展开收起图标
export const HistoryExpandIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="展开历史记录" onClick={onClick}>
    <svg
      className="icon"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
    >
      <path
        d="M146.285714 292.571429m36.571429 0l292.571428 0q36.571429 0 36.571429 36.571428l0 0q0 36.571429-36.571429 36.571429l-292.571428 0q-36.571429 0-36.571429-36.571429l0 0q0-36.571429 36.571429-36.571428Z"
        fill="#2c2c2c"
      ></path>
      <path
        d="M146.285714 438.857143m36.571429 0l219.428571 0q36.571429 0 36.571429 36.571428l0 0q0 36.571429-36.571429 36.571429l-219.428571 0q-36.571429 0-36.571429-36.571429l0 0q0-36.571429 36.571429-36.571428Z"
        fill="#2c2c2c"
      ></path>
      <path
        d="M146.285714 585.142857m36.571429 0l146.285714 0q36.571429 0 36.571429 36.571429l0 0q0 36.571429-36.571429 36.571428l-146.285714 0q-36.571429 0-36.571429-36.571428l0 0q0-36.571429 36.571429-36.571429Z"
        fill="#2c2c2c"
      ></path>
      <path
        d="M694.857143 1024H109.714286a109.714286 109.714286 0 0 1-109.714286-109.714286V109.714286a109.714286 109.714286 0 0 1 109.714286-109.714286h621.714285a109.714286 109.714286 0 0 1 109.714286 109.714286v329.142857h-73.142857V109.714286a36.571429 36.571429 0 0 0-36.571429-36.571429H109.714286a36.571429 36.571429 0 0 0-36.571429 36.571429v804.571428a36.571429 36.571429 0 0 0 36.571429 36.571429h585.142857z"
        fill="#2c2c2c"
      ></path>
      <path
        d="M713.142857 1024a310.857143 310.857143 0 1 1 310.857143-310.857143 311.222857 311.222857 0 0 1-310.857143 310.857143z m0-548.571429a237.714286 237.714286 0 1 0 237.714286 237.714286 238.08 238.08 0 0 0-237.714286-237.714286z"
        fill="#2c2c2c"
      ></path>
      <path
        d="M841.142857 768h-182.857143v-219.428571a36.571429 36.571429 0 0 1 73.142857 0v146.285714h109.714286a36.571429 36.571429 0 0 1 0 73.142857z"
        fill="#2c2c2c"
      ></path>
    </svg>
  </IconWrapWithClick>
);

//  新增 AI Chat
export const AddChatIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="新增 AI Chat" onClick={onClick}>
    <svg
      className="icon"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
    >
      <path
        d="M512 9.309091c273.128727 0 495.429818 217.832727 502.504727 489.285818l0.186182 14.149818c0 83.642182-17.314909 152.436364-52.782545 205.637818a37.236364 37.236364 0 0 1-61.998546-41.332363c24.669091-36.957091 38.260364-86.621091 40.075637-149.550546L940.218182 512a428.218182 428.218182 0 0 0-856.250182-12.427636L83.781818 512v232.727273a195.490909 195.490909 0 0 0 185.716364 195.258182L279.272727 940.218182h231.610182c59.019636 0 118.085818-7.912727 177.338182-23.738182a37.236364 37.236364 0 0 1 19.223273 71.912727 761.949091 761.949091 0 0 1-171.985455 25.879273l-24.576 0.418909H279.272727a269.963636 269.963636 0 0 1-269.777454-259.630545L9.309091 744.727273v-232.727273C9.309091 234.356364 234.356364 9.309091 512 9.309091z m50.269091 515.258182a37.236364 37.236364 0 0 1 4.654545 74.193454l-4.654545 0.279273H286.301091a37.236364 37.236364 0 0 1-4.654546-74.146909l4.654546-0.279273h275.874909z m139.636364-186.181818a37.236364 37.236364 0 0 1 4.654545 74.193454l-4.654545 0.279273H286.301091a37.236364 37.236364 0 0 1-4.654546-74.146909l4.654546-0.279273h415.511273z"
        fill="#333333"
      ></path>
      <path
        d="M847.872 734.487273c21.410909 0 38.772364 17.361455 38.772364 38.772363v38.772364h38.772363a38.772364 38.772364 0 1 1 0 77.591273h-38.772363v38.818909a38.772364 38.772364 0 0 1-77.591273 0v-38.818909h-38.772364a38.772364 38.772364 0 1 1 0-77.544728l38.772364-0.046545v-38.772364c0-21.410909 17.361455-38.772364 38.818909-38.772363z"
        fill="#333333"
      ></path>
    </svg>
  </IconWrapWithClick>
);

export const PersonIcon = () => (
  <IconWrapStatic label="用户">
    <svg
      className="icon"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
    >
      <path
        d="M599.37972406 453.70867834c70.38961801-32.03941202 115.17197729-101.45813845 115.17197729-178.52263326 0-108.98254628-83.01120353-187.38201668-192.23647209-187.38201668s-192.96464138 79.12763847-192.96464138 187.98882301c0 79.61308426 46.23869664 145.02688389 119.78371163 176.09540554 32.03941202 13.71383884 97.21048937 20.2673551 150.24542455 1.82042139z m-166.75057634 68.32647312c-4.00492681-1.33497561-8.49529819-2.18450542-12.50022619-3.88356506-97.45321165-41.02015598-165.65832423-136.28886342-165.65832302-241.75192746 0-144.42007757 112.13794205-266.63101691 267.48054672-266.63101691 158.61936219 0 267.48054672 121.84685531 267.4805455 266.14557113 0 102.18630653-64.8069921 196.60548293-158.01255466 239.203338-72.45276167 31.55396623-144.66279985 24.87908944-198.78998835 6.9176003z m-296.36456296 471.85316098c-35.07344725-0.12136175-71.48187011-15.89834426-89.92880382-44.90372225-17.84012739-28.03448522-15.65562197-67.35558277-1.57769789-97.3318499 48.90864784-104.37081194 176.94493537-280.10213345 485.44563807-284.83522833 317.23872438-5.82534819 432.65342517 182.4061983 473.18813537 294.54414036 10.67980359 29.49082256 12.37886324 56.31169392-5.21854066 88.47246768-20.75280089 33.37438762-56.67577795 41.50560176-89.92880504 41.50560176h-80.46261406c-17.84012739 0-32.03941202-18.20421142-32.03941203-36.0443376s14.56336865-33.8598334 32.28213431-33.8598334h82.4043972c12.37886324 0 18.81101895-0.24272228 25.60725751-9.83027499 3.51948102-4.97581838 7.64576836-16.01970601 2.91267349-29.00537678-42.35513158-117.11376043-156.43485677-244.66460217-410.68700923-244.66460096-249.88314161 0-355.71029091 128.03628752-410.68700922 234.5916049-4.73309488 10.07299728-5.70398644 24.63636594 0.36408404 33.98119393 6.55351626 10.31571956 13.95656234 14.80609215 26.82087135 14.80609215h547.0972344c17.84012739 0 33.6171099 17.71876564 33.6171099 35.55889304 0 17.84012739-14.56336865 36.89386864-32.40349604 36.89386864"
        fill="#2c2c2c"
      ></path>
    </svg>
  </IconWrapStatic>
);

export const AddSuccessIcon = ({ onClick }: { onClick?: () => void }) => (
  <IconWrapWithClick label="新增成功" onClick={onClick}>
    <svg
      t="1761988705907"
      class="icon"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="1263"
      width="200"
      height="200"
    >
      <path
        d="M713 442.9L504 652.5l-209.4-210c-8.9-8.9-23.3-8.9-32.2 0-8.9 8.9-8.9 23.4 0 32.3L487.9 701c8.9 8.9 23.3 8.9 32.2 0l225.1-225.7c8.9-8.9 8.9-23.3 0-32.3-8.9-9-23.3-9-32.2-0.1zM512 64C213.3 64 64 213.3 64 512s149.3 448 448 448 448-149.3 448-448S810.7 64 512 64z m0 803.2c-236.8 0-355.3-118.4-355.3-355.3 0-236.8 118.4-355.2 355.3-355.2s355.3 118.4 355.3 355.2c-0.1 236.9-118.5 355.3-355.3 355.3z"
        fill="#040000"
        p-id="1264"
      ></path>
    </svg>
  </IconWrapWithClick>
);
