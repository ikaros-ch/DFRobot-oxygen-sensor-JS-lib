let ADDRESS_0 = 112
let ADDRESS_1 = 113
let ADDRESS_2 = 114
let ADDRESS_3 = 115
let OXYGEN_DATA_REGISTER = 3
let USER_SET_REGISTER = 8
let AUTUAL_SET_REGISTER = 9
let GET_KEY_REGISTER = 10
class DFRobot_Oxygen {
    private key: number = 0.0;
    private count: number = 0;
    private txbuf: number[] = [0];
    private oxygendata: number[] = (() => {
        const arr: number[] = [];
        for (let j = 0; j < 101; j++) {
            arr.push(0);
        }
        return arr;
    })();
    private address: number;

    constructor(address: number) {
        this.address = address;
    }

    private writeRegister(register: number, data: number[]): void {
        const buffer = pins.createBuffer(data.length + 1);
        buffer[0] = register;
        for (let k = 0; k < data.length; k++) {
            buffer[k + 1] = data[k];
        }
        //pins.i2cWriteBuffer(this.address, buffer);
    }

    private readRegister(register: number, length: number): number[] {
        try {
            pins.i2cWriteNumber(this.address, register, NumberFormat.UInt8BE);
            const buffer2 = pins.i2cReadBuffer(this.address, length);
            const result: number[] = [];
            for (let l = 0; l < length; l++) {
                result.push(buffer2[l]);
            }
            return result;
        } catch (e) {
            
            return [];
        }
    }

    public getFlash(): void {
        const result2 = this.readRegister(GET_KEY_REGISTER, 1);
        if (result2.length > 0 && result2[0] !== undefined) {
            if (result2[0] === 0) {
                this.key = 20.9 / 120.0;
            } else {
                this.key = result2[0] / 1000.0;
            }
        } else {
            //serial.writeLine("Failed to read key value, using default.");
            this.key = 20.9 / 120.0;
        }
        serial.writeLine("Key Value: " + this.key);
        basic.pause(100);
    }

    public calibrate(vol: number, mv: number): void {
        this.txbuf[0] = Math.round(vol * 10);
        if (mv < 0.000001 && mv > -0.000001) {
            this.writeRegister(USER_SET_REGISTER, this.txbuf);
        } else {
            this.txbuf[0] = Math.round((vol / mv) * 1000);
            this.writeRegister(AUTUAL_SET_REGISTER, this.txbuf);
        }
    }

    public getOxygenData(collectNum: number): number {
        this.getFlash();
        if (collectNum > 0) {
            for (let num = collectNum - 1; num > 0; num--) {
                this.oxygendata[num] = this.oxygendata[num - 1];
            }
            const result3 = this.readRegister(OXYGEN_DATA_REGISTER, 3);
            //serial.writeLine("Raw Register Data: " + result.join(", "));
            if (result3.length === 3) {
                const rawData = result3[0] + result3[1] / 10.0 + result3[2] / 100.0;
                this.oxygendata[0] = this.key * rawData;
                //serial.writeLine("Raw Data: " + rawData + ", Oxygen Data: " + this.oxygendata[0]);
            } else {
                //serial.writeLine("Failed to read oxygen data, returning 0.");
                this.oxygendata[0] = 0;
            }

            if (this.count < collectNum) {
                this.count++;
            }
            return this.getAverageNum(this.oxygendata, this.count);
        } else if (collectNum > 100 || collectNum <= 0) {
            return -1;
        }
        return 0;
    }

    private getAverageNum(data: number[], length: number): number {
        let sum2 = 0.0;
        for (let m = 0; m < length; m++) {
            sum2 += data[m];
        }
        return sum2 / length;
    }
}
